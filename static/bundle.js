(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Chart = require('./chart'),
    PillsBar = require('./pills-bar'),
    Contoller = require('./controller');

// retrieve data
d3.json('./data.json', init);

function init (err, data){
    var contoller = new Contoller(),
        chart = new Chart(),
        pillsBar = new PillsBar();

    contoller.init(data);
    chart.init(data);
    pillsBar.init(data);
}
},{"./chart":2,"./controller":3,"./pills-bar":4}],2:[function(require,module,exports){
var height = 300,
    tileWidth = 200,
    barWidth = 40,
    scrollWrapper = d3.select('.scroll_wrapper'),
    chart = d3.select('#chart').append('svg').attr('height', height + 40),
    scale = d3.select('#scale').append('svg').attr({ 'height': height + 20, 'width': 60 }),
    monthTile = d3.select('#month_tile').append('svg').attr({ 'height': height, 'width': tileWidth }),
    months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],

    // default config
    config = {
        video: 0,
        activity: 'views',
        period: 'daily',
        showWeekdays: true
    };


// constructor
function Chart (){
    // make this class a singleton
    if ( arguments.callee._singletonInstance ) {
        return arguments.callee._singletonInstance;
    }
    arguments.callee._singletonInstance = this;

}

Chart.prototype.init = function (data){
    var self = this;

    this.data = data;
    this.config = config;
    this.monthTicksOffsets = [];

    this.render(this.getChartData(data));

    scrollWrapper.on('scroll', function (){
        var scrollLeft = this.scrollLeft;

        self._placeTile(scrollLeft);
    });
};

Chart.prototype._getMonthsData = function (chartData){
    var monthsData = [];

    // fill months data
    chartData.forEach((function (){
        var currentMonth = '';
        return function (item, i){
            // use d3.time.format("%b %Y").parse;
            var month = months[item.key.getMonth()],
                year =  item.key.getFullYear(),
                monthString = months[item.key.getMonth()] + ' ' + item.key.getFullYear();

            if ( monthString !== currentMonth ) {
                monthsData.push({
                    monthString: monthString,
                    month: month,
                    year: year,
                    offset: i * barWidth
                });

                currentMonth = monthString;
            }
        }
    })());

    return monthsData;
};

Chart.prototype.getChartData = function (){
    // get an array of key-value objects
    var dataHash = this.data[config.video][config.activity],
        data = d3.map(dataHash).entries();

    // parse date strings
    data.forEach(function (item){
        item.key = new Date(item.key);
    });

    // sort data by date
    data = data.sort(function (a, b){
        var aTime = a.key.getTime(),
            bTime = b.key.getTime();
        return aTime - bTime;
    });

    if ( config.period === 'daily' ) {
        // make daily values
        data = data.map(function (item, i){
            var result = { key: item.key };

            if ( i > 0 ){
                result.value = item.value - data[i - 1].value;
            } else {
                result.value = item.value;
            }
            return result;
        });
    }

    return data;
};

Chart.prototype._getTopValue = function (data){
    var value = d3.max(data, function (item){
            return item.value;
        }),
        digitsLength = value.toString().length,
        zerosNumber = digitsLength - 1,
        testNumber = '1',
        max = 0,
        residue;

    if ( digitsLength <= 1 ){
        max = 10;
        return max;
    }

    while ( zerosNumber ) {
        testNumber += '0';
        zerosNumber--;
    }
    testNumber = +testNumber;

    residue = value % testNumber;
    rounded = value + (testNumber - residue);

    if ( value < 100 ){
        rounded = rounded.toString().split('');
        rounded[0] = +rounded[0] > 5 ? '10': '5';
        max = +(rounded.join(''));
    } else {
        max = rounded;
    }
    return max;
};

Chart.prototype.render = function (data){
    var y = d3.scale.linear().domain([0, this._getTopValue(data)]).range([height, 0]),
        scaleData = y.ticks(4).map(y.tickFormat(4, "d")),
        chartWidth = data.length * barWidth,
        monthsData = this._getMonthsData(data);


    // set the canvas width
    chart.attr('width', chartWidth);

    this.chartWidth = chartWidth;

    // clear canvas
    chart.selectAll('*').remove();
    d3.select('#month_tile').select('svg').selectAll('*').remove();

    chart.append('line')
        .attr({
            'x1': 0,
            'y1': height,
            'x2': chartWidth,
            'y2': height,
            'class': 'timeline'
        });

    // draw month ticks
    this._drawMonthTicks(monthsData);

    // draw scale
    scale.select('g').remove();

    scale.append('g')
        .attr('class', 'axis')
        .call(d3.svg.axis()
            .scale(y)
            .orient('right')
            .ticks(4)
            .tickFormat( d3.format('s') ) );

    // draw bars
    if ( config.period === 'daily' ){
        this._drawDailyBars(data, y);
    } else {
        this._drawGrossBars(data, y);
    }
};

Chart.prototype._drawMonthTicks = function (monthsData){
    var scrollLeft = scrollWrapper.node().scrollLeft,
        monthTicks = chart.append('g')
        .attr({ 'class': 'month_ticks' });

    var monthTick = monthTicks.selectAll('g.month_tick')
        .data(monthsData)
        .enter()
        .append('g')
        .attr({
            'transform': function(d, i) { return 'translate(' + d.offset + ', 0)'; },
            'class': 'month_tick'
        });

    monthTick.append('line')
        .attr({
            'x1': 0,
            'y1': 0,
            'x2': 0,
            'y2': height
        });

    var monthText = monthTick.append('text')
        .attr({ 'x': 10, 'y': 0 });

    monthText.append('tspan')
        .attr({
            'dy': '40px',
            'x': '10',
            'class': 'month_tick_month'
        })
        .text(function (d){ return d.month });

    monthText.append('tspan')
        .attr({
            'dy': '40px',
            'x': '10',
            'class': 'month_tick_year'
        })
        .text(function (d){ return d.year });

    // copy month ticks to the month tile
    monthTile.node().appendChild(chart.select('g.month_ticks').node().cloneNode(true));

    this.tileMonthTicks = monthTile.selectAll('.month_tick');
    this.tileMonthTicks.attr('transform', 'translate(0, 0)');
    this.chartMonthTicks = chart.selectAll('.month_tick');

    // get nessacery ticks details
    this.monthTicksRanges = monthsData.map(function (item, i, arr){
        var next = arr[i + 1],
            edge = next ? next.offset : this.chartWidth;

        return {
            offset: item.offset,
            edge: edge
        };
    }.bind(this));

    // place the right tile
    this.currentTileIndex = null;
    this._placeTile(scrollLeft);
};

Chart.prototype._placeTile = function (scrollLeft){
    var rightTileIndex = 0,
        currentTileDetails;

    this.monthTicksRanges.forEach(function (item, i){
        if ( scrollLeft >= item.offset && scrollLeft <= item.edge ) {
            rightTileIndex = i;
        }
    });

    if ( this.currentTileIndex !== rightTileIndex ) {
        this.chartMonthTicks.classed('hidden', false).filter(':nth-child('+ (rightTileIndex+1) +')').classed('hidden', true);

        this.currentTile = this.tileMonthTicks.filter(':nth-child('+ (rightTileIndex+1) +')');

        this.tileMonthTicks.classed('hidden', true);

        this.currentTile.classed('hidden', false);

        this.currentTileIndex = rightTileIndex;
    }

    currentTileDetails = this.monthTicksRanges[this.currentTileIndex];

    if ( scrollLeft > (currentTileDetails.edge - 200) ) {
        this.currentTile.attr('transform', 'translate(' + (currentTileDetails.edge - (scrollLeft + 200)) + ', 0)');
    } else {
        this.currentTile.attr('transform', 'translate(0, 0)');
    }
};

Chart.prototype._drawDailyBars = function (data, y) {
    var bar = chart.selectAll('g.bar')
        .data(data)
        .enter()
        .append('g')
        .attr({
            'transform': function(d, i) { return 'translate(' + i * barWidth + ', 0)'; },
            'class': 'bar'
        });

    bar.append('rect')
        .attr({
            'shape-rendering': 'crispEdges',
            'fill': 'rgba(57, 186, 130, 0.3)',
            'width': barWidth,
            'height': 0,
            'class': 'bar_сolumn',
            'transform': 'translate(0,'+ height +')'
        })
        .transition()
        .duration(500)
        .attr({
            'height': function (d){
                return height - y(d.value);
            },
            'transform': function (d, i) {
                return 'translate(0,'+ y(d.value) + ')';
            }
        });

    bar.append('rect')
        .attr({
            'shape-rendering': 'crispEdges',
            'fill': 'rgba(57, 186, 130, 1)',
            'width': barWidth,
            'height': 2,
            'class': 'bar_column_head',
            'transform': 'translate(0,'+ height + ')'
        })
        .transition()
        .duration(500)
        .attr({
            'transform': function (d, i) {
                return 'translate(0,'+ y(d.value) + ')';
            }
        });

    bar.append('text')
        .attr({
            'class': 'value',
            'x': barWidth / 2,
            'y': height,
            'fill-opacity': 0
        })
        .text(function(d) { return d.value; })
        .transition()
        .duration(500)
        .attr({
            'y': function (d){
                return y(d.value) - 5;
            },
            'fill-opacity': 1
        });

    this.bar = bar;

    this._drawTimeline(bar);
}

Chart.prototype._drawGrossBars = function (data, y){
    var area = d3.svg.area()
        .interpolate('monotone')
        .x(function(d, i) { return i * barWidth + (barWidth / 2); })
        .y0(height)
        .y1(function(d, i) { return y(d.value); });

    chart.append('path')
        .datum(data)
        .attr({
            'class': 'area',
            'd': area
        });

    var line = d3.svg.line()
        .x(function(d, i) { return i * barWidth + (barWidth / 2); })
        .y(function(d, i) { return y(d.value); })
        .interpolate('linear');

    chart.append('path')
        .datum(data)
        .attr({
            'class': 'curve',
            'd': line
        });

    var bar = chart.selectAll('g.bar')
        .data(data)
        .enter()
        .append('g')
        .attr({
            'transform': function(d, i) { return 'translate(' + i * barWidth + ', 0)'; },
            'class': 'bar gross_bar'
        });

    bar.append('text')
        .attr({
            'class': 'value',
            'x': barWidth / 2,
            'y': function (d){
                return y(d.value) - 20;
            }
        })
        .text(function (d){
            return d.value;
        });

    bar.on('mouseover', function (){
            var target = d3.select(this),
                circle = target.select('.circle'),
                circleStroke = target.select('.circle_stroke'),
                value = target.select('.value');

            circleStroke.attr({
                'r': 8
            });

            circle.attr({
                'r': 6
            });

            target.classed('hover', true);
        })
        .on('mouseout', function (){
            var target = d3.select(this),
                circle = target.select('.circle'),
                circleStroke = target.select('.circle_stroke'),
                value = target.select('.value');

            circleStroke.attr({
                'r': 6
            });

            circle.attr({
                'r': 4
            });

            target.classed('hover', false);
        });

    bar.append('circle')
        .attr({
            'class': 'circle_stroke',
            'r': 6,
            'cx': barWidth / 2,
            'cy': function (d){
                return Math.round(y(d.value));
            }
        });

    bar.append('circle')
        .attr({
            'class': 'circle',
            'r': 4,
            'cx': barWidth / 2,
            'cy': function (d){
                return Math.round(y(d.value));
            }
        });

    this._drawTimeline(bar);
}

Chart.prototype._drawTimeline = function (bar){
    var lineHeight = 5;
    // days
    bar.append('text')
        .attr({
            'x': barWidth / 2,
            'y': height + 15,
            'class': function (d){
                var day = d.key.getDay();
                return (day === 0 || day === 6) && config.showWeekdays ? 'date holiday': 'date';
            }
        })
        .text( function(d){
            return d.key.getDate();
        });

    // weekdays
    if ( config.showWeekdays ) {
        bar.append('text')
            .attr({
                'x': barWidth / 2,
                'y': height + 30,
                'class': function (d){
                    var day = d.key.getDay();
                    return day === 0 || day === 6 ? 'weekday holiday': 'weekday';
                }
            })
            .text( function(d){
                var day = d.key.getDay();
                return weekdays[day];
            });

        lineHeight = 30;
    }

    // divider
    bar.append('line')
        .attr({
            'x1': barWidth,
            'y1': height,
            'x2': barWidth,
            'y2': height + lineHeight,
            'class': 'timeline'
        });
}

Chart.prototype.resetValues = function (callback){
    var duration = 250,
        timer = null;

    if ( config.period === 'daily' ) {
        this.bar.selectAll('.bar_column_head')
            .transition()
            .duration(duration)
            .attr({
                'transform': 'translate(0,'+ height + ')'
            });

        this.bar.selectAll('.bar_сolumn')
            .transition()
            .duration(duration)
            .attr({
                'transform': 'translate(0,'+ height + ')',
                'height': 0
            });

        this.bar.selectAll('.value')
            .transition()
            .duration(duration)
            .attr({
                'y': height,
                'fill-opacity': 0
            })
            .each('end', function (){
                clearTimeout(timer);
                timer = setTimeout(callback, 100);
            });
    } else {
        callback();
    }
}

Chart.prototype.changeVideo = function (value){

    this.resetValues(function (){
        config.video = value;
        var chartData = this.getChartData()
        this.render(chartData);
    }.bind(this));
};

Chart.prototype.changeActivity = function (value){

    this.resetValues(function (){
        config.activity = value;
        var chartData = this.getChartData()
        this.render(chartData);
    }.bind(this));
};

Chart.prototype.changePeriod = function (value){
    config.period = value;
    var chartData = this.getChartData();

    this.render(chartData);
};

module.exports = Chart;

},{}],3:[function(require,module,exports){
var Chart = require('./chart'),
    PillsBar = require('./pills-bar'),
    chart = new Chart(),
    pillsBar = new PillsBar(),
    videoSelect = d3.select('#video_select'),
    switchers = d3.selectAll('.switcher');

function Controller (){
    // make this class a singleton
    if ( arguments.callee._singletonInstance ) {
        return arguments.callee._singletonInstance;
    }
    arguments.callee._singletonInstance = this;
}

Controller.prototype.init = function (data){
    var self = this;
    this.data = data;

    this.videoSelect = videoSelect;
    this.switchers = switchers;

    this.render();
    // attach events
    switchers.selectAll('span').on('click', function (e){
        var target = d3.select(this),
            parent = d3.select(this.parentNode),
            action = this.parentNode.dataset.action,
            value = this.dataset.value;

        parent.selectAll('span').classed('active', false);
        target.classed('active', true);

        self[action](value);
    });

    videoSelect.on('change', function (e){
        var videoIndex = +this.value;
        self.switchVideo(videoIndex);
    });
};

Controller.prototype.render = function (){
    var videoNames = this.data.map(function (item, i){ return item.name; }),
        videoUpdate = videoSelect.selectAll('option').data(videoNames);

    videoUpdate
    .enter()
    .append('option')
    .text(function (d){
        return d;
    })
    .attr('value', function (d){
        return videoNames.indexOf(d);
    });
};

Controller.prototype.switchVideo = function (videoIndex){
    chart.changeVideo(videoIndex);
    pillsBar.changeVideo(videoIndex);
};

Controller.prototype.switchActivity = function (value){
    chart.changeActivity(value);
};

Controller.prototype.switchPeriod = function (value){
    chart.changePeriod(value);
};

module.exports = Controller;
},{"./chart":2,"./pills-bar":4}],4:[function(require,module,exports){
var brandsElem = d3.select('#brands'),
    brandsHolder = d3.select('#brands_holder');

function PillsBar (){
    // make this class a singleton
    if ( arguments.callee._singletonInstance ) {
        return arguments.callee._singletonInstance;
    }
    arguments.callee._singletonInstance = this;
}

PillsBar.prototype.init = function (data){
    this.data = data;

    this.brandsData = this.data[0].brands;

    this.brandsHolder = brandsHolder;

    this.render(this.brandsData);
};

PillsBar.prototype.render = function (brandsData){
    brandsHolder.selectAll('*').remove();

    if ( brandsData.length === 0 ) {
        brandsElem.classed('hidden', true);
        return;
    } else {
        brandsElem.classed('hidden', false);
    }

    var brandsUpdate = brandsHolder.selectAll('.brand_pill').data(brandsData);

    brandsUpdate.enter()
        .append('span')
        .attr('class', 'brand_pill')
        .text(function (d){
            return d;
        });
};

PillsBar.prototype.changeVideo = function (videoIndex){
    this.brandsData = this.data[videoIndex].brands;

    this.render(this.brandsData);
}

module.exports = PillsBar;
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaXZhbi55dW5kYVxcQXBwRGF0YVxcUm9hbWluZ1xcbnBtXFxub2RlX21vZHVsZXNcXHdhdGNoaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL2FwcC5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL2NoYXJ0LmpzIiwiRDovbWF2ZW5zLXNvY2lhbC1pbnRlcmFjdGlvbnMvanMvY29udHJvbGxlci5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL3BpbGxzLWJhci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ2hhcnQgPSByZXF1aXJlKCcuL2NoYXJ0JyksXHJcbiAgICBQaWxsc0JhciA9IHJlcXVpcmUoJy4vcGlsbHMtYmFyJyksXHJcbiAgICBDb250b2xsZXIgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXInKTtcclxuXHJcbi8vIHJldHJpZXZlIGRhdGFcclxuZDMuanNvbignLi9kYXRhLmpzb24nLCBpbml0KTtcclxuXHJcbmZ1bmN0aW9uIGluaXQgKGVyciwgZGF0YSl7XHJcbiAgICB2YXIgY29udG9sbGVyID0gbmV3IENvbnRvbGxlcigpLFxyXG4gICAgICAgIGNoYXJ0ID0gbmV3IENoYXJ0KCksXHJcbiAgICAgICAgcGlsbHNCYXIgPSBuZXcgUGlsbHNCYXIoKTtcclxuXHJcbiAgICBjb250b2xsZXIuaW5pdChkYXRhKTtcclxuICAgIGNoYXJ0LmluaXQoZGF0YSk7XHJcbiAgICBwaWxsc0Jhci5pbml0KGRhdGEpO1xyXG59IiwidmFyIGhlaWdodCA9IDMwMCxcclxuICAgIHRpbGVXaWR0aCA9IDIwMCxcclxuICAgIGJhcldpZHRoID0gNDAsXHJcbiAgICBzY3JvbGxXcmFwcGVyID0gZDMuc2VsZWN0KCcuc2Nyb2xsX3dyYXBwZXInKSxcclxuICAgIGNoYXJ0ID0gZDMuc2VsZWN0KCcjY2hhcnQnKS5hcHBlbmQoJ3N2ZycpLmF0dHIoJ2hlaWdodCcsIGhlaWdodCArIDQwKSxcclxuICAgIHNjYWxlID0gZDMuc2VsZWN0KCcjc2NhbGUnKS5hcHBlbmQoJ3N2ZycpLmF0dHIoeyAnaGVpZ2h0JzogaGVpZ2h0ICsgMjAsICd3aWR0aCc6IDYwIH0pLFxyXG4gICAgbW9udGhUaWxlID0gZDMuc2VsZWN0KCcjbW9udGhfdGlsZScpLmFwcGVuZCgnc3ZnJykuYXR0cih7ICdoZWlnaHQnOiBoZWlnaHQsICd3aWR0aCc6IHRpbGVXaWR0aCB9KSxcclxuICAgIG1vbnRocyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddLFxyXG4gICAgd2Vla2RheXMgPSBbJ1NVTicsICdNT04nLCAnVFVFJywgJ1dFRCcsICdUSFUnLCAnRlJJJywgJ1NBVCddLFxyXG5cclxuICAgIC8vIGRlZmF1bHQgY29uZmlnXHJcbiAgICBjb25maWcgPSB7XHJcbiAgICAgICAgdmlkZW86IDAsXHJcbiAgICAgICAgYWN0aXZpdHk6ICd2aWV3cycsXHJcbiAgICAgICAgcGVyaW9kOiAnZGFpbHknLFxyXG4gICAgICAgIHNob3dXZWVrZGF5czogdHJ1ZVxyXG4gICAgfTtcclxuXHJcblxyXG4vLyBjb25zdHJ1Y3RvclxyXG5mdW5jdGlvbiBDaGFydCAoKXtcclxuICAgIC8vIG1ha2UgdGhpcyBjbGFzcyBhIHNpbmdsZXRvblxyXG4gICAgaWYgKCBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZSApIHtcclxuICAgICAgICByZXR1cm4gYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2U7XHJcbiAgICB9XHJcbiAgICBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZSA9IHRoaXM7XHJcblxyXG59XHJcblxyXG5DaGFydC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChkYXRhKXtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuXHJcbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xyXG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XHJcbiAgICB0aGlzLm1vbnRoVGlja3NPZmZzZXRzID0gW107XHJcblxyXG4gICAgdGhpcy5yZW5kZXIodGhpcy5nZXRDaGFydERhdGEoZGF0YSkpO1xyXG5cclxuICAgIHNjcm9sbFdyYXBwZXIub24oJ3Njcm9sbCcsIGZ1bmN0aW9uICgpe1xyXG4gICAgICAgIHZhciBzY3JvbGxMZWZ0ID0gdGhpcy5zY3JvbGxMZWZ0O1xyXG5cclxuICAgICAgICBzZWxmLl9wbGFjZVRpbGUoc2Nyb2xsTGVmdCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZ2V0TW9udGhzRGF0YSA9IGZ1bmN0aW9uIChjaGFydERhdGEpe1xyXG4gICAgdmFyIG1vbnRoc0RhdGEgPSBbXTtcclxuXHJcbiAgICAvLyBmaWxsIG1vbnRocyBkYXRhXHJcbiAgICBjaGFydERhdGEuZm9yRWFjaCgoZnVuY3Rpb24gKCl7XHJcbiAgICAgICAgdmFyIGN1cnJlbnRNb250aCA9ICcnO1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoaXRlbSwgaSl7XHJcbiAgICAgICAgICAgIC8vIHVzZSBkMy50aW1lLmZvcm1hdChcIiViICVZXCIpLnBhcnNlO1xyXG4gICAgICAgICAgICB2YXIgbW9udGggPSBtb250aHNbaXRlbS5rZXkuZ2V0TW9udGgoKV0sXHJcbiAgICAgICAgICAgICAgICB5ZWFyID0gIGl0ZW0ua2V5LmdldEZ1bGxZZWFyKCksXHJcbiAgICAgICAgICAgICAgICBtb250aFN0cmluZyA9IG1vbnRoc1tpdGVtLmtleS5nZXRNb250aCgpXSArICcgJyArIGl0ZW0ua2V5LmdldEZ1bGxZZWFyKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIG1vbnRoU3RyaW5nICE9PSBjdXJyZW50TW9udGggKSB7XHJcbiAgICAgICAgICAgICAgICBtb250aHNEYXRhLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoU3RyaW5nOiBtb250aFN0cmluZyxcclxuICAgICAgICAgICAgICAgICAgICBtb250aDogbW9udGgsXHJcbiAgICAgICAgICAgICAgICAgICAgeWVhcjogeWVhcixcclxuICAgICAgICAgICAgICAgICAgICBvZmZzZXQ6IGkgKiBiYXJXaWR0aFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgY3VycmVudE1vbnRoID0gbW9udGhTdHJpbmc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9KSgpKTtcclxuXHJcbiAgICByZXR1cm4gbW9udGhzRGF0YTtcclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5nZXRDaGFydERhdGEgPSBmdW5jdGlvbiAoKXtcclxuICAgIC8vIGdldCBhbiBhcnJheSBvZiBrZXktdmFsdWUgb2JqZWN0c1xyXG4gICAgdmFyIGRhdGFIYXNoID0gdGhpcy5kYXRhW2NvbmZpZy52aWRlb11bY29uZmlnLmFjdGl2aXR5XSxcclxuICAgICAgICBkYXRhID0gZDMubWFwKGRhdGFIYXNoKS5lbnRyaWVzKCk7XHJcblxyXG4gICAgLy8gcGFyc2UgZGF0ZSBzdHJpbmdzXHJcbiAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pe1xyXG4gICAgICAgIGl0ZW0ua2V5ID0gbmV3IERhdGUoaXRlbS5rZXkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gc29ydCBkYXRhIGJ5IGRhdGVcclxuICAgIGRhdGEgPSBkYXRhLnNvcnQoZnVuY3Rpb24gKGEsIGIpe1xyXG4gICAgICAgIHZhciBhVGltZSA9IGEua2V5LmdldFRpbWUoKSxcclxuICAgICAgICAgICAgYlRpbWUgPSBiLmtleS5nZXRUaW1lKCk7XHJcbiAgICAgICAgcmV0dXJuIGFUaW1lIC0gYlRpbWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoIGNvbmZpZy5wZXJpb2QgPT09ICdkYWlseScgKSB7XHJcbiAgICAgICAgLy8gbWFrZSBkYWlseSB2YWx1ZXNcclxuICAgICAgICBkYXRhID0gZGF0YS5tYXAoZnVuY3Rpb24gKGl0ZW0sIGkpe1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0geyBrZXk6IGl0ZW0ua2V5IH07XHJcblxyXG4gICAgICAgICAgICBpZiAoIGkgPiAwICl7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQudmFsdWUgPSBpdGVtLnZhbHVlIC0gZGF0YVtpIC0gMV0udmFsdWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQudmFsdWUgPSBpdGVtLnZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGRhdGE7XHJcbn07XHJcblxyXG5DaGFydC5wcm90b3R5cGUuX2dldFRvcFZhbHVlID0gZnVuY3Rpb24gKGRhdGEpe1xyXG4gICAgdmFyIHZhbHVlID0gZDMubWF4KGRhdGEsIGZ1bmN0aW9uIChpdGVtKXtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0udmFsdWU7XHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgZGlnaXRzTGVuZ3RoID0gdmFsdWUudG9TdHJpbmcoKS5sZW5ndGgsXHJcbiAgICAgICAgemVyb3NOdW1iZXIgPSBkaWdpdHNMZW5ndGggLSAxLFxyXG4gICAgICAgIHRlc3ROdW1iZXIgPSAnMScsXHJcbiAgICAgICAgbWF4ID0gMCxcclxuICAgICAgICByZXNpZHVlO1xyXG5cclxuICAgIGlmICggZGlnaXRzTGVuZ3RoIDw9IDEgKXtcclxuICAgICAgICBtYXggPSAxMDtcclxuICAgICAgICByZXR1cm4gbWF4O1xyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlICggemVyb3NOdW1iZXIgKSB7XHJcbiAgICAgICAgdGVzdE51bWJlciArPSAnMCc7XHJcbiAgICAgICAgemVyb3NOdW1iZXItLTtcclxuICAgIH1cclxuICAgIHRlc3ROdW1iZXIgPSArdGVzdE51bWJlcjtcclxuXHJcbiAgICByZXNpZHVlID0gdmFsdWUgJSB0ZXN0TnVtYmVyO1xyXG4gICAgcm91bmRlZCA9IHZhbHVlICsgKHRlc3ROdW1iZXIgLSByZXNpZHVlKTtcclxuXHJcbiAgICBpZiAoIHZhbHVlIDwgMTAwICl7XHJcbiAgICAgICAgcm91bmRlZCA9IHJvdW5kZWQudG9TdHJpbmcoKS5zcGxpdCgnJyk7XHJcbiAgICAgICAgcm91bmRlZFswXSA9ICtyb3VuZGVkWzBdID4gNSA/ICcxMCc6ICc1JztcclxuICAgICAgICBtYXggPSArKHJvdW5kZWQuam9pbignJykpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBtYXggPSByb3VuZGVkO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1heDtcclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoZGF0YSl7XHJcbiAgICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMCwgdGhpcy5fZ2V0VG9wVmFsdWUoZGF0YSldKS5yYW5nZShbaGVpZ2h0LCAwXSksXHJcbiAgICAgICAgc2NhbGVEYXRhID0geS50aWNrcyg0KS5tYXAoeS50aWNrRm9ybWF0KDQsIFwiZFwiKSksXHJcbiAgICAgICAgY2hhcnRXaWR0aCA9IGRhdGEubGVuZ3RoICogYmFyV2lkdGgsXHJcbiAgICAgICAgbW9udGhzRGF0YSA9IHRoaXMuX2dldE1vbnRoc0RhdGEoZGF0YSk7XHJcblxyXG5cclxuICAgIC8vIHNldCB0aGUgY2FudmFzIHdpZHRoXHJcbiAgICBjaGFydC5hdHRyKCd3aWR0aCcsIGNoYXJ0V2lkdGgpO1xyXG5cclxuICAgIHRoaXMuY2hhcnRXaWR0aCA9IGNoYXJ0V2lkdGg7XHJcblxyXG4gICAgLy8gY2xlYXIgY2FudmFzXHJcbiAgICBjaGFydC5zZWxlY3RBbGwoJyonKS5yZW1vdmUoKTtcclxuICAgIGQzLnNlbGVjdCgnI21vbnRoX3RpbGUnKS5zZWxlY3QoJ3N2ZycpLnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xyXG5cclxuICAgIGNoYXJ0LmFwcGVuZCgnbGluZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAneDEnOiAwLFxyXG4gICAgICAgICAgICAneTEnOiBoZWlnaHQsXHJcbiAgICAgICAgICAgICd4Mic6IGNoYXJ0V2lkdGgsXHJcbiAgICAgICAgICAgICd5Mic6IGhlaWdodCxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ3RpbWVsaW5lJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIC8vIGRyYXcgbW9udGggdGlja3NcclxuICAgIHRoaXMuX2RyYXdNb250aFRpY2tzKG1vbnRoc0RhdGEpO1xyXG5cclxuICAgIC8vIGRyYXcgc2NhbGVcclxuICAgIHNjYWxlLnNlbGVjdCgnZycpLnJlbW92ZSgpO1xyXG5cclxuICAgIHNjYWxlLmFwcGVuZCgnZycpXHJcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2F4aXMnKVxyXG4gICAgICAgIC5jYWxsKGQzLnN2Zy5heGlzKClcclxuICAgICAgICAgICAgLnNjYWxlKHkpXHJcbiAgICAgICAgICAgIC5vcmllbnQoJ3JpZ2h0JylcclxuICAgICAgICAgICAgLnRpY2tzKDQpXHJcbiAgICAgICAgICAgIC50aWNrRm9ybWF0KCBkMy5mb3JtYXQoJ3MnKSApICk7XHJcblxyXG4gICAgLy8gZHJhdyBiYXJzXHJcbiAgICBpZiAoIGNvbmZpZy5wZXJpb2QgPT09ICdkYWlseScgKXtcclxuICAgICAgICB0aGlzLl9kcmF3RGFpbHlCYXJzKGRhdGEsIHkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLl9kcmF3R3Jvc3NCYXJzKGRhdGEsIHkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9kcmF3TW9udGhUaWNrcyA9IGZ1bmN0aW9uIChtb250aHNEYXRhKXtcclxuICAgIHZhciBzY3JvbGxMZWZ0ID0gc2Nyb2xsV3JhcHBlci5ub2RlKCkuc2Nyb2xsTGVmdCxcclxuICAgICAgICBtb250aFRpY2tzID0gY2hhcnQuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7ICdjbGFzcyc6ICdtb250aF90aWNrcycgfSk7XHJcblxyXG4gICAgdmFyIG1vbnRoVGljayA9IG1vbnRoVGlja3Muc2VsZWN0QWxsKCdnLm1vbnRoX3RpY2snKVxyXG4gICAgICAgIC5kYXRhKG1vbnRoc0RhdGEpXHJcbiAgICAgICAgLmVudGVyKClcclxuICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBkLm9mZnNldCArICcsIDApJzsgfSxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ21vbnRoX3RpY2snXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgbW9udGhUaWNrLmFwcGVuZCgnbGluZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAneDEnOiAwLFxyXG4gICAgICAgICAgICAneTEnOiAwLFxyXG4gICAgICAgICAgICAneDInOiAwLFxyXG4gICAgICAgICAgICAneTInOiBoZWlnaHRcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB2YXIgbW9udGhUZXh0ID0gbW9udGhUaWNrLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgLmF0dHIoeyAneCc6IDEwLCAneSc6IDAgfSk7XHJcblxyXG4gICAgbW9udGhUZXh0LmFwcGVuZCgndHNwYW4nKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2R5JzogJzQwcHgnLFxyXG4gICAgICAgICAgICAneCc6ICcxMCcsXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdtb250aF90aWNrX21vbnRoJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpeyByZXR1cm4gZC5tb250aCB9KTtcclxuXHJcbiAgICBtb250aFRleHQuYXBwZW5kKCd0c3BhbicpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnZHknOiAnNDBweCcsXHJcbiAgICAgICAgICAgICd4JzogJzEwJyxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ21vbnRoX3RpY2tfeWVhcidcclxuICAgICAgICB9KVxyXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKXsgcmV0dXJuIGQueWVhciB9KTtcclxuXHJcbiAgICAvLyBjb3B5IG1vbnRoIHRpY2tzIHRvIHRoZSBtb250aCB0aWxlXHJcbiAgICBtb250aFRpbGUubm9kZSgpLmFwcGVuZENoaWxkKGNoYXJ0LnNlbGVjdCgnZy5tb250aF90aWNrcycpLm5vZGUoKS5jbG9uZU5vZGUodHJ1ZSkpO1xyXG5cclxuICAgIHRoaXMudGlsZU1vbnRoVGlja3MgPSBtb250aFRpbGUuc2VsZWN0QWxsKCcubW9udGhfdGljaycpO1xyXG4gICAgdGhpcy50aWxlTW9udGhUaWNrcy5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKDAsIDApJyk7XHJcbiAgICB0aGlzLmNoYXJ0TW9udGhUaWNrcyA9IGNoYXJ0LnNlbGVjdEFsbCgnLm1vbnRoX3RpY2snKTtcclxuXHJcbiAgICAvLyBnZXQgbmVzc2FjZXJ5IHRpY2tzIGRldGFpbHNcclxuICAgIHRoaXMubW9udGhUaWNrc1JhbmdlcyA9IG1vbnRoc0RhdGEubWFwKGZ1bmN0aW9uIChpdGVtLCBpLCBhcnIpe1xyXG4gICAgICAgIHZhciBuZXh0ID0gYXJyW2kgKyAxXSxcclxuICAgICAgICAgICAgZWRnZSA9IG5leHQgPyBuZXh0Lm9mZnNldCA6IHRoaXMuY2hhcnRXaWR0aDtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgb2Zmc2V0OiBpdGVtLm9mZnNldCxcclxuICAgICAgICAgICAgZWRnZTogZWRnZVxyXG4gICAgICAgIH07XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG5cclxuICAgIC8vIHBsYWNlIHRoZSByaWdodCB0aWxlXHJcbiAgICB0aGlzLmN1cnJlbnRUaWxlSW5kZXggPSBudWxsO1xyXG4gICAgdGhpcy5fcGxhY2VUaWxlKHNjcm9sbExlZnQpO1xyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9wbGFjZVRpbGUgPSBmdW5jdGlvbiAoc2Nyb2xsTGVmdCl7XHJcbiAgICB2YXIgcmlnaHRUaWxlSW5kZXggPSAwLFxyXG4gICAgICAgIGN1cnJlbnRUaWxlRGV0YWlscztcclxuXHJcbiAgICB0aGlzLm1vbnRoVGlja3NSYW5nZXMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaSl7XHJcbiAgICAgICAgaWYgKCBzY3JvbGxMZWZ0ID49IGl0ZW0ub2Zmc2V0ICYmIHNjcm9sbExlZnQgPD0gaXRlbS5lZGdlICkge1xyXG4gICAgICAgICAgICByaWdodFRpbGVJbmRleCA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCB0aGlzLmN1cnJlbnRUaWxlSW5kZXggIT09IHJpZ2h0VGlsZUluZGV4ICkge1xyXG4gICAgICAgIHRoaXMuY2hhcnRNb250aFRpY2tzLmNsYXNzZWQoJ2hpZGRlbicsIGZhbHNlKS5maWx0ZXIoJzpudGgtY2hpbGQoJysgKHJpZ2h0VGlsZUluZGV4KzEpICsnKScpLmNsYXNzZWQoJ2hpZGRlbicsIHRydWUpO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlID0gdGhpcy50aWxlTW9udGhUaWNrcy5maWx0ZXIoJzpudGgtY2hpbGQoJysgKHJpZ2h0VGlsZUluZGV4KzEpICsnKScpO1xyXG5cclxuICAgICAgICB0aGlzLnRpbGVNb250aFRpY2tzLmNsYXNzZWQoJ2hpZGRlbicsIHRydWUpO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlLmNsYXNzZWQoJ2hpZGRlbicsIGZhbHNlKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50VGlsZUluZGV4ID0gcmlnaHRUaWxlSW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgY3VycmVudFRpbGVEZXRhaWxzID0gdGhpcy5tb250aFRpY2tzUmFuZ2VzW3RoaXMuY3VycmVudFRpbGVJbmRleF07XHJcblxyXG4gICAgaWYgKCBzY3JvbGxMZWZ0ID4gKGN1cnJlbnRUaWxlRGV0YWlscy5lZGdlIC0gMjAwKSApIHtcclxuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIChjdXJyZW50VGlsZURldGFpbHMuZWRnZSAtIChzY3JvbGxMZWZ0ICsgMjAwKSkgKyAnLCAwKScpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoMCwgMCknKTtcclxuICAgIH1cclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZHJhd0RhaWx5QmFycyA9IGZ1bmN0aW9uIChkYXRhLCB5KSB7XHJcbiAgICB2YXIgYmFyID0gY2hhcnQuc2VsZWN0QWxsKCdnLmJhcicpXHJcbiAgICAgICAgLmRhdGEoZGF0YSlcclxuICAgICAgICAuZW50ZXIoKVxyXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuICd0cmFuc2xhdGUoJyArIGkgKiBiYXJXaWR0aCArICcsIDApJzsgfSxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2JhcidcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBiYXIuYXBwZW5kKCdyZWN0JylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdzaGFwZS1yZW5kZXJpbmcnOiAnY3Jpc3BFZGdlcycsXHJcbiAgICAgICAgICAgICdmaWxsJzogJ3JnYmEoNTcsIDE4NiwgMTMwLCAwLjMpJyxcclxuICAgICAgICAgICAgJ3dpZHRoJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICdoZWlnaHQnOiAwLFxyXG4gICAgICAgICAgICAnY2xhc3MnOiAnYmFyX9GBb2x1bW4nLFxyXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgwLCcrIGhlaWdodCArJyknXHJcbiAgICAgICAgfSlcclxuICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgLmR1cmF0aW9uKDUwMClcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdoZWlnaHQnOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaGVpZ2h0IC0geShkLnZhbHVlKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uIChkLCBpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgwLCcrIHkoZC52YWx1ZSkgKyAnKSc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICBiYXIuYXBwZW5kKCdyZWN0JylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdzaGFwZS1yZW5kZXJpbmcnOiAnY3Jpc3BFZGdlcycsXHJcbiAgICAgICAgICAgICdmaWxsJzogJ3JnYmEoNTcsIDE4NiwgMTMwLCAxKScsXHJcbiAgICAgICAgICAgICd3aWR0aCc6IGJhcldpZHRoLFxyXG4gICAgICAgICAgICAnaGVpZ2h0JzogMixcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2Jhcl9jb2x1bW5faGVhZCcsXHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiAndHJhbnNsYXRlKDAsJysgaGVpZ2h0ICsgJyknXHJcbiAgICAgICAgfSlcclxuICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgLmR1cmF0aW9uKDUwMClcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbiAoZCwgaSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoMCwnKyB5KGQudmFsdWUpICsgJyknO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAndmFsdWUnLFxyXG4gICAgICAgICAgICAneCc6IGJhcldpZHRoIC8gMixcclxuICAgICAgICAgICAgJ3knOiBoZWlnaHQsXHJcbiAgICAgICAgICAgICdmaWxsLW9wYWNpdHknOiAwXHJcbiAgICAgICAgfSlcclxuICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KVxyXG4gICAgICAgIC50cmFuc2l0aW9uKClcclxuICAgICAgICAuZHVyYXRpb24oNTAwKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3knOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geShkLnZhbHVlKSAtIDU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICdmaWxsLW9wYWNpdHknOiAxXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdGhpcy5iYXIgPSBiYXI7XHJcblxyXG4gICAgdGhpcy5fZHJhd1RpbWVsaW5lKGJhcik7XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZHJhd0dyb3NzQmFycyA9IGZ1bmN0aW9uIChkYXRhLCB5KXtcclxuICAgIHZhciBhcmVhID0gZDMuc3ZnLmFyZWEoKVxyXG4gICAgICAgIC5pbnRlcnBvbGF0ZSgnbW9ub3RvbmUnKVxyXG4gICAgICAgIC54KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGkgKiBiYXJXaWR0aCArIChiYXJXaWR0aCAvIDIpOyB9KVxyXG4gICAgICAgIC55MChoZWlnaHQpXHJcbiAgICAgICAgLnkxKGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIHkoZC52YWx1ZSk7IH0pO1xyXG5cclxuICAgIGNoYXJ0LmFwcGVuZCgncGF0aCcpXHJcbiAgICAgICAgLmRhdHVtKGRhdGEpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAnYXJlYScsXHJcbiAgICAgICAgICAgICdkJzogYXJlYVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKVxyXG4gICAgICAgIC54KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGkgKiBiYXJXaWR0aCArIChiYXJXaWR0aCAvIDIpOyB9KVxyXG4gICAgICAgIC55KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIHkoZC52YWx1ZSk7IH0pXHJcbiAgICAgICAgLmludGVycG9sYXRlKCdsaW5lYXInKTtcclxuXHJcbiAgICBjaGFydC5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAgIC5kYXR1bShkYXRhKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2N1cnZlJyxcclxuICAgICAgICAgICAgJ2QnOiBsaW5lXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdmFyIGJhciA9IGNoYXJ0LnNlbGVjdEFsbCgnZy5iYXInKVxyXG4gICAgICAgIC5kYXRhKGRhdGEpXHJcbiAgICAgICAgLmVudGVyKClcclxuICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBpICogYmFyV2lkdGggKyAnLCAwKSc7IH0sXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdiYXIgZ3Jvc3NfYmFyJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ3ZhbHVlJyxcclxuICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICd5JzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHkoZC52YWx1ZSkgLSAyMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICByZXR1cm4gZC52YWx1ZTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBiYXIub24oJ21vdXNlb3ZlcicsIGZ1bmN0aW9uICgpe1xyXG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gZDMuc2VsZWN0KHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgY2lyY2xlID0gdGFyZ2V0LnNlbGVjdCgnLmNpcmNsZScpLFxyXG4gICAgICAgICAgICAgICAgY2lyY2xlU3Ryb2tlID0gdGFyZ2V0LnNlbGVjdCgnLmNpcmNsZV9zdHJva2UnKSxcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdGFyZ2V0LnNlbGVjdCgnLnZhbHVlJyk7XHJcblxyXG4gICAgICAgICAgICBjaXJjbGVTdHJva2UuYXR0cih7XHJcbiAgICAgICAgICAgICAgICAncic6IDhcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjaXJjbGUuYXR0cih7XHJcbiAgICAgICAgICAgICAgICAncic6IDZcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0YXJnZXQuY2xhc3NlZCgnaG92ZXInLCB0cnVlKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIC5vbignbW91c2VvdXQnLCBmdW5jdGlvbiAoKXtcclxuICAgICAgICAgICAgdmFyIHRhcmdldCA9IGQzLnNlbGVjdCh0aGlzKSxcclxuICAgICAgICAgICAgICAgIGNpcmNsZSA9IHRhcmdldC5zZWxlY3QoJy5jaXJjbGUnKSxcclxuICAgICAgICAgICAgICAgIGNpcmNsZVN0cm9rZSA9IHRhcmdldC5zZWxlY3QoJy5jaXJjbGVfc3Ryb2tlJyksXHJcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHRhcmdldC5zZWxlY3QoJy52YWx1ZScpO1xyXG5cclxuICAgICAgICAgICAgY2lyY2xlU3Ryb2tlLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3InOiA2XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgY2lyY2xlLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3InOiA0XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGFyZ2V0LmNsYXNzZWQoJ2hvdmVyJywgZmFsc2UpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAnY2lyY2xlX3N0cm9rZScsXHJcbiAgICAgICAgICAgICdyJzogNixcclxuICAgICAgICAgICAgJ2N4JzogYmFyV2lkdGggLyAyLFxyXG4gICAgICAgICAgICAnY3knOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh5KGQudmFsdWUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAnY2lyY2xlJyxcclxuICAgICAgICAgICAgJ3InOiA0LFxyXG4gICAgICAgICAgICAnY3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICdjeSc6IGZ1bmN0aW9uIChkKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHkoZC52YWx1ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdGhpcy5fZHJhd1RpbWVsaW5lKGJhcik7XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZHJhd1RpbWVsaW5lID0gZnVuY3Rpb24gKGJhcil7XHJcbiAgICB2YXIgbGluZUhlaWdodCA9IDU7XHJcbiAgICAvLyBkYXlzXHJcbiAgICBiYXIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd4JzogYmFyV2lkdGggLyAyLFxyXG4gICAgICAgICAgICAneSc6IGhlaWdodCArIDE1LFxyXG4gICAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGF5ID0gZC5rZXkuZ2V0RGF5KCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRheSA9PT0gMCB8fCBkYXkgPT09IDYpICYmIGNvbmZpZy5zaG93V2Vla2RheXMgPyAnZGF0ZSBob2xpZGF5JzogJ2RhdGUnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICAudGV4dCggZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgICAgIHJldHVybiBkLmtleS5nZXREYXRlKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgLy8gd2Vla2RheXNcclxuICAgIGlmICggY29uZmlnLnNob3dXZWVrZGF5cyApIHtcclxuICAgICAgICBiYXIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICAgICAneSc6IGhlaWdodCArIDMwLFxyXG4gICAgICAgICAgICAgICAgJ2NsYXNzJzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF5ID09PSAwIHx8IGRheSA9PT0gNiA/ICd3ZWVrZGF5IGhvbGlkYXknOiAnd2Vla2RheSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50ZXh0KCBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB3ZWVrZGF5c1tkYXldO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGluZUhlaWdodCA9IDMwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRpdmlkZXJcclxuICAgIGJhci5hcHBlbmQoJ2xpbmUnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3gxJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICd5MSc6IGhlaWdodCxcclxuICAgICAgICAgICAgJ3gyJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICd5Mic6IGhlaWdodCArIGxpbmVIZWlnaHQsXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICd0aW1lbGluZSdcclxuICAgICAgICB9KTtcclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLnJlc2V0VmFsdWVzID0gZnVuY3Rpb24gKGNhbGxiYWNrKXtcclxuICAgIHZhciBkdXJhdGlvbiA9IDI1MCxcclxuICAgICAgICB0aW1lciA9IG51bGw7XHJcblxyXG4gICAgaWYgKCBjb25maWcucGVyaW9kID09PSAnZGFpbHknICkge1xyXG4gICAgICAgIHRoaXMuYmFyLnNlbGVjdEFsbCgnLmJhcl9jb2x1bW5faGVhZCcpXHJcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcclxuICAgICAgICAgICAgLmR1cmF0aW9uKGR1cmF0aW9uKVxyXG4gICAgICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgwLCcrIGhlaWdodCArICcpJ1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5iYXIuc2VsZWN0QWxsKCcuYmFyX9GBb2x1bW4nKVxyXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcclxuICAgICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoMCwnKyBoZWlnaHQgKyAnKScsXHJcbiAgICAgICAgICAgICAgICAnaGVpZ2h0JzogMFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5iYXIuc2VsZWN0QWxsKCcudmFsdWUnKVxyXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcclxuICAgICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3knOiBoZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAnZmlsbC1vcGFjaXR5JzogMFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuZWFjaCgnZW5kJywgZnVuY3Rpb24gKCl7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xyXG4gICAgICAgICAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2soKTtcclxuICAgIH1cclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLmNoYW5nZVZpZGVvID0gZnVuY3Rpb24gKHZhbHVlKXtcclxuXHJcbiAgICB0aGlzLnJlc2V0VmFsdWVzKGZ1bmN0aW9uICgpe1xyXG4gICAgICAgIGNvbmZpZy52aWRlbyA9IHZhbHVlO1xyXG4gICAgICAgIHZhciBjaGFydERhdGEgPSB0aGlzLmdldENoYXJ0RGF0YSgpXHJcbiAgICAgICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5DaGFydC5wcm90b3R5cGUuY2hhbmdlQWN0aXZpdHkgPSBmdW5jdGlvbiAodmFsdWUpe1xyXG5cclxuICAgIHRoaXMucmVzZXRWYWx1ZXMoZnVuY3Rpb24gKCl7XHJcbiAgICAgICAgY29uZmlnLmFjdGl2aXR5ID0gdmFsdWU7XHJcbiAgICAgICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKClcclxuICAgICAgICB0aGlzLnJlbmRlcihjaGFydERhdGEpO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5jaGFuZ2VQZXJpb2QgPSBmdW5jdGlvbiAodmFsdWUpe1xyXG4gICAgY29uZmlnLnBlcmlvZCA9IHZhbHVlO1xyXG4gICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKCk7XHJcblxyXG4gICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhcnQ7XHJcbiIsInZhciBDaGFydCA9IHJlcXVpcmUoJy4vY2hhcnQnKSxcclxuICAgIFBpbGxzQmFyID0gcmVxdWlyZSgnLi9waWxscy1iYXInKSxcclxuICAgIGNoYXJ0ID0gbmV3IENoYXJ0KCksXHJcbiAgICBwaWxsc0JhciA9IG5ldyBQaWxsc0JhcigpLFxyXG4gICAgdmlkZW9TZWxlY3QgPSBkMy5zZWxlY3QoJyN2aWRlb19zZWxlY3QnKSxcclxuICAgIHN3aXRjaGVycyA9IGQzLnNlbGVjdEFsbCgnLnN3aXRjaGVyJyk7XHJcblxyXG5mdW5jdGlvbiBDb250cm9sbGVyICgpe1xyXG4gICAgLy8gbWFrZSB0aGlzIGNsYXNzIGEgc2luZ2xldG9uXHJcbiAgICBpZiAoIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlICkge1xyXG4gICAgICAgIHJldHVybiBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZTtcclxuICAgIH1cclxuICAgIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlID0gdGhpcztcclxufVxyXG5cclxuQ29udHJvbGxlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChkYXRhKXtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcblxyXG4gICAgdGhpcy52aWRlb1NlbGVjdCA9IHZpZGVvU2VsZWN0O1xyXG4gICAgdGhpcy5zd2l0Y2hlcnMgPSBzd2l0Y2hlcnM7XHJcblxyXG4gICAgdGhpcy5yZW5kZXIoKTtcclxuICAgIC8vIGF0dGFjaCBldmVudHNcclxuICAgIHN3aXRjaGVycy5zZWxlY3RBbGwoJ3NwYW4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZSl7XHJcbiAgICAgICAgdmFyIHRhcmdldCA9IGQzLnNlbGVjdCh0aGlzKSxcclxuICAgICAgICAgICAgcGFyZW50ID0gZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZSksXHJcbiAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMucGFyZW50Tm9kZS5kYXRhc2V0LmFjdGlvbixcclxuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmRhdGFzZXQudmFsdWU7XHJcblxyXG4gICAgICAgIHBhcmVudC5zZWxlY3RBbGwoJ3NwYW4nKS5jbGFzc2VkKCdhY3RpdmUnLCBmYWxzZSk7XHJcbiAgICAgICAgdGFyZ2V0LmNsYXNzZWQoJ2FjdGl2ZScsIHRydWUpO1xyXG5cclxuICAgICAgICBzZWxmW2FjdGlvbl0odmFsdWUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgdmlkZW9TZWxlY3Qub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChlKXtcclxuICAgICAgICB2YXIgdmlkZW9JbmRleCA9ICt0aGlzLnZhbHVlO1xyXG4gICAgICAgIHNlbGYuc3dpdGNoVmlkZW8odmlkZW9JbmRleCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uICgpe1xyXG4gICAgdmFyIHZpZGVvTmFtZXMgPSB0aGlzLmRhdGEubWFwKGZ1bmN0aW9uIChpdGVtLCBpKXsgcmV0dXJuIGl0ZW0ubmFtZTsgfSksXHJcbiAgICAgICAgdmlkZW9VcGRhdGUgPSB2aWRlb1NlbGVjdC5zZWxlY3RBbGwoJ29wdGlvbicpLmRhdGEodmlkZW9OYW1lcyk7XHJcblxyXG4gICAgdmlkZW9VcGRhdGVcclxuICAgIC5lbnRlcigpXHJcbiAgICAuYXBwZW5kKCdvcHRpb24nKVxyXG4gICAgLnRleHQoZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgIHJldHVybiBkO1xyXG4gICAgfSlcclxuICAgIC5hdHRyKCd2YWx1ZScsIGZ1bmN0aW9uIChkKXtcclxuICAgICAgICByZXR1cm4gdmlkZW9OYW1lcy5pbmRleE9mKGQpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zd2l0Y2hWaWRlbyA9IGZ1bmN0aW9uICh2aWRlb0luZGV4KXtcclxuICAgIGNoYXJ0LmNoYW5nZVZpZGVvKHZpZGVvSW5kZXgpO1xyXG4gICAgcGlsbHNCYXIuY2hhbmdlVmlkZW8odmlkZW9JbmRleCk7XHJcbn07XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zd2l0Y2hBY3Rpdml0eSA9IGZ1bmN0aW9uICh2YWx1ZSl7XHJcbiAgICBjaGFydC5jaGFuZ2VBY3Rpdml0eSh2YWx1ZSk7XHJcbn07XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zd2l0Y2hQZXJpb2QgPSBmdW5jdGlvbiAodmFsdWUpe1xyXG4gICAgY2hhcnQuY2hhbmdlUGVyaW9kKHZhbHVlKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbGxlcjsiLCJ2YXIgYnJhbmRzRWxlbSA9IGQzLnNlbGVjdCgnI2JyYW5kcycpLFxyXG4gICAgYnJhbmRzSG9sZGVyID0gZDMuc2VsZWN0KCcjYnJhbmRzX2hvbGRlcicpO1xyXG5cclxuZnVuY3Rpb24gUGlsbHNCYXIgKCl7XHJcbiAgICAvLyBtYWtlIHRoaXMgY2xhc3MgYSBzaW5nbGV0b25cclxuICAgIGlmICggYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgKSB7XHJcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgPSB0aGlzO1xyXG59XHJcblxyXG5QaWxsc0Jhci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChkYXRhKXtcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcblxyXG4gICAgdGhpcy5icmFuZHNEYXRhID0gdGhpcy5kYXRhWzBdLmJyYW5kcztcclxuXHJcbiAgICB0aGlzLmJyYW5kc0hvbGRlciA9IGJyYW5kc0hvbGRlcjtcclxuXHJcbiAgICB0aGlzLnJlbmRlcih0aGlzLmJyYW5kc0RhdGEpO1xyXG59O1xyXG5cclxuUGlsbHNCYXIucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uIChicmFuZHNEYXRhKXtcclxuICAgIGJyYW5kc0hvbGRlci5zZWxlY3RBbGwoJyonKS5yZW1vdmUoKTtcclxuXHJcbiAgICBpZiAoIGJyYW5kc0RhdGEubGVuZ3RoID09PSAwICkge1xyXG4gICAgICAgIGJyYW5kc0VsZW0uY2xhc3NlZCgnaGlkZGVuJywgdHJ1ZSk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBicmFuZHNFbGVtLmNsYXNzZWQoJ2hpZGRlbicsIGZhbHNlKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgYnJhbmRzVXBkYXRlID0gYnJhbmRzSG9sZGVyLnNlbGVjdEFsbCgnLmJyYW5kX3BpbGwnKS5kYXRhKGJyYW5kc0RhdGEpO1xyXG5cclxuICAgIGJyYW5kc1VwZGF0ZS5lbnRlcigpXHJcbiAgICAgICAgLmFwcGVuZCgnc3BhbicpXHJcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2JyYW5kX3BpbGwnKVxyXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKXtcclxuICAgICAgICAgICAgcmV0dXJuIGQ7XHJcbiAgICAgICAgfSk7XHJcbn07XHJcblxyXG5QaWxsc0Jhci5wcm90b3R5cGUuY2hhbmdlVmlkZW8gPSBmdW5jdGlvbiAodmlkZW9JbmRleCl7XHJcbiAgICB0aGlzLmJyYW5kc0RhdGEgPSB0aGlzLmRhdGFbdmlkZW9JbmRleF0uYnJhbmRzO1xyXG5cclxuICAgIHRoaXMucmVuZGVyKHRoaXMuYnJhbmRzRGF0YSk7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gUGlsbHNCYXI7Il19
