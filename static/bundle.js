(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Chart = require('./chart'),
    Contoller = require('./controller');

// retrieve data
d3.json('./data.json', init);

function init (err, data){
    var contoller = new Contoller(),
        chart = new Chart();

    contoller.init(data);
    chart.init(data);

}
},{"./chart":2,"./controller":3}],2:[function(require,module,exports){
var height = 300,
    barWidth = 40,
    scrollWrapper = d3.select('.scroll_wrapper'),
    chart = d3.select('#chart').append('svg').attr('height', height + 40),
    scale = d3.select('#scale').append('svg').attr({ 'height': height + 20, 'width':60 }),
    monthTile = d3.select('#month_tile').append('svg').attr({ 'height': height, 'width': 200 }),
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

    var chartData = this.getChartData();
    this.monthTicksOffsets = [];

    this.render(chartData);

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

    this.monthTicks = chart.selectAll('.month_tick');


    // get nessacery ticks details
    this.monthTicksOffsets = monthsData.map(function (item, i, arr){
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

    this.monthTicksOffsets.forEach(function (item, i){
        if ( scrollLeft >= item.offset && scrollLeft <= item.edge ) {
            rightTileIndex = i;
        }
    });

    if ( this.currentTileIndex !== rightTileIndex ) {
        this.monthTicks.classed('hidden', false).filter(':nth-child('+ (rightTileIndex+1) +')').classed('hidden', true);

        this.currentTile = this.tileMonthTicks.filter(':nth-child('+ (rightTileIndex+1) +')');

        this.tileMonthTicks.classed('hidden', true);

        this.currentTile.classed('hidden', false);

        this.currentTileIndex = rightTileIndex;
    }

    currentTileDetails = this.monthTicksOffsets[this.currentTileIndex];

    if ( scrollLeft > (currentTileDetails.edge - 200) ) {
        this.currentTile.attr('transform', 'translate(' + (currentTileDetails.edge - (scrollLeft + 200)) + ', 0)');
    } else {
        this.currentTile.attr('transform', 'translate(0, 0)');
    }
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
}

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
}

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
}

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
    chart = new Chart(),
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

    this._fillVideoSelect();
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

        chart.changeVideo(videoIndex);
    });
};

Controller.prototype._fillVideoSelect = function (){
    var videoNames = this.data.map(function (item, i){ return item.name; }),
        videoUpdate = videoSelect.selectAll('options').data(videoNames);

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

Controller.prototype.switchActivity = function (value){
    chart.changeActivity(value);
};

Controller.prototype.switchPeriod = function (value){
    chart.changePeriod(value);
};

module.exports = Controller;
},{"./chart":2}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaXZhbi55dW5kYVxcQXBwRGF0YVxcUm9hbWluZ1xcbnBtXFxub2RlX21vZHVsZXNcXHdhdGNoaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL2FwcC5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL2NoYXJ0LmpzIiwiRDovbWF2ZW5zLXNvY2lhbC1pbnRlcmFjdGlvbnMvanMvY29udHJvbGxlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4akJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDaGFydCA9IHJlcXVpcmUoJy4vY2hhcnQnKSxcclxuICAgIENvbnRvbGxlciA9IHJlcXVpcmUoJy4vY29udHJvbGxlcicpO1xyXG5cclxuLy8gcmV0cmlldmUgZGF0YVxyXG5kMy5qc29uKCcuL2RhdGEuanNvbicsIGluaXQpO1xyXG5cclxuZnVuY3Rpb24gaW5pdCAoZXJyLCBkYXRhKXtcclxuICAgIHZhciBjb250b2xsZXIgPSBuZXcgQ29udG9sbGVyKCksXHJcbiAgICAgICAgY2hhcnQgPSBuZXcgQ2hhcnQoKTtcclxuXHJcbiAgICBjb250b2xsZXIuaW5pdChkYXRhKTtcclxuICAgIGNoYXJ0LmluaXQoZGF0YSk7XHJcblxyXG59IiwidmFyIGhlaWdodCA9IDMwMCxcclxuICAgIGJhcldpZHRoID0gNDAsXHJcbiAgICBzY3JvbGxXcmFwcGVyID0gZDMuc2VsZWN0KCcuc2Nyb2xsX3dyYXBwZXInKSxcclxuICAgIGNoYXJ0ID0gZDMuc2VsZWN0KCcjY2hhcnQnKS5hcHBlbmQoJ3N2ZycpLmF0dHIoJ2hlaWdodCcsIGhlaWdodCArIDQwKSxcclxuICAgIHNjYWxlID0gZDMuc2VsZWN0KCcjc2NhbGUnKS5hcHBlbmQoJ3N2ZycpLmF0dHIoeyAnaGVpZ2h0JzogaGVpZ2h0ICsgMjAsICd3aWR0aCc6NjAgfSksXHJcbiAgICBtb250aFRpbGUgPSBkMy5zZWxlY3QoJyNtb250aF90aWxlJykuYXBwZW5kKCdzdmcnKS5hdHRyKHsgJ2hlaWdodCc6IGhlaWdodCwgJ3dpZHRoJzogMjAwIH0pLFxyXG4gICAgbW9udGhzID0gWydKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsICdKdW5lJywgJ0p1bHknLCAnQXVndXN0JywgJ1NlcHRlbWJlcicsICdPY3RvYmVyJywgJ05vdmVtYmVyJywgJ0RlY2VtYmVyJ10sXHJcbiAgICB3ZWVrZGF5cyA9IFsnU1VOJywgJ01PTicsICdUVUUnLCAnV0VEJywgJ1RIVScsICdGUkknLCAnU0FUJ10sXHJcblxyXG4gICAgLy8gZGVmYXVsdCBjb25maWdcclxuICAgIGNvbmZpZyA9IHtcclxuICAgICAgICB2aWRlbzogMCxcclxuICAgICAgICBhY3Rpdml0eTogJ3ZpZXdzJyxcclxuICAgICAgICBwZXJpb2Q6ICdkYWlseScsXHJcbiAgICAgICAgc2hvd1dlZWtkYXlzOiB0cnVlXHJcbiAgICB9O1xyXG5cclxuXHJcbi8vIGNvbnN0cnVjdG9yXHJcbmZ1bmN0aW9uIENoYXJ0ICgpe1xyXG4gICAgLy8gbWFrZSB0aGlzIGNsYXNzIGEgc2luZ2xldG9uXHJcbiAgICBpZiAoIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlICkge1xyXG4gICAgICAgIHJldHVybiBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZTtcclxuICAgIH1cclxuICAgIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlID0gdGhpcztcclxuXHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKGRhdGEpe1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdGhpcy5kYXRhID0gZGF0YTtcclxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG5cclxuICAgIHZhciBjaGFydERhdGEgPSB0aGlzLmdldENoYXJ0RGF0YSgpO1xyXG4gICAgdGhpcy5tb250aFRpY2tzT2Zmc2V0cyA9IFtdO1xyXG5cclxuICAgIHRoaXMucmVuZGVyKGNoYXJ0RGF0YSk7XHJcblxyXG4gICAgc2Nyb2xsV3JhcHBlci5vbignc2Nyb2xsJywgZnVuY3Rpb24gKCl7XHJcbiAgICAgICAgdmFyIHNjcm9sbExlZnQgPSB0aGlzLnNjcm9sbExlZnQ7XHJcblxyXG4gICAgICAgIHNlbGYuX3BsYWNlVGlsZShzY3JvbGxMZWZ0KTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9nZXRNb250aHNEYXRhID0gZnVuY3Rpb24gKGNoYXJ0RGF0YSl7XHJcbiAgICB2YXIgbW9udGhzRGF0YSA9IFtdO1xyXG5cclxuICAgIC8vIGZpbGwgbW9udGhzIGRhdGFcclxuICAgIGNoYXJ0RGF0YS5mb3JFYWNoKChmdW5jdGlvbiAoKXtcclxuICAgICAgICB2YXIgY3VycmVudE1vbnRoID0gJyc7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChpdGVtLCBpKXtcclxuICAgICAgICAgICAgLy8gdXNlIGQzLnRpbWUuZm9ybWF0KFwiJWIgJVlcIikucGFyc2U7XHJcbiAgICAgICAgICAgIHZhciBtb250aCA9IG1vbnRoc1tpdGVtLmtleS5nZXRNb250aCgpXSxcclxuICAgICAgICAgICAgICAgIHllYXIgPSAgaXRlbS5rZXkuZ2V0RnVsbFllYXIoKSxcclxuICAgICAgICAgICAgICAgIG1vbnRoU3RyaW5nID0gbW9udGhzW2l0ZW0ua2V5LmdldE1vbnRoKCldICsgJyAnICsgaXRlbS5rZXkuZ2V0RnVsbFllYXIoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICggbW9udGhTdHJpbmcgIT09IGN1cnJlbnRNb250aCApIHtcclxuICAgICAgICAgICAgICAgIG1vbnRoc0RhdGEucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9udGhTdHJpbmc6IG1vbnRoU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoOiBtb250aCxcclxuICAgICAgICAgICAgICAgICAgICB5ZWFyOiB5ZWFyLFxyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogaSAqIGJhcldpZHRoXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50TW9udGggPSBtb250aFN0cmluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pKCkpO1xyXG5cclxuICAgIHJldHVybiBtb250aHNEYXRhO1xyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9kcmF3TW9udGhUaWNrcyA9IGZ1bmN0aW9uIChtb250aHNEYXRhKXtcclxuICAgIHZhciBzY3JvbGxMZWZ0ID0gc2Nyb2xsV3JhcHBlci5ub2RlKCkuc2Nyb2xsTGVmdCxcclxuICAgICAgICBtb250aFRpY2tzID0gY2hhcnQuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7ICdjbGFzcyc6ICdtb250aF90aWNrcycgfSk7XHJcblxyXG4gICAgdmFyIG1vbnRoVGljayA9IG1vbnRoVGlja3Muc2VsZWN0QWxsKCdnLm1vbnRoX3RpY2snKVxyXG4gICAgICAgIC5kYXRhKG1vbnRoc0RhdGEpXHJcbiAgICAgICAgLmVudGVyKClcclxuICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBkLm9mZnNldCArICcsIDApJzsgfSxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ21vbnRoX3RpY2snXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgbW9udGhUaWNrLmFwcGVuZCgnbGluZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAneDEnOiAwLFxyXG4gICAgICAgICAgICAneTEnOiAwLFxyXG4gICAgICAgICAgICAneDInOiAwLFxyXG4gICAgICAgICAgICAneTInOiBoZWlnaHRcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB2YXIgbW9udGhUZXh0ID0gbW9udGhUaWNrLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgLmF0dHIoeyAneCc6IDEwLCAneSc6IDAgfSk7XHJcblxyXG4gICAgbW9udGhUZXh0LmFwcGVuZCgndHNwYW4nKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2R5JzogJzQwcHgnLFxyXG4gICAgICAgICAgICAneCc6ICcxMCcsXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdtb250aF90aWNrX21vbnRoJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpeyByZXR1cm4gZC5tb250aCB9KTtcclxuXHJcbiAgICBtb250aFRleHQuYXBwZW5kKCd0c3BhbicpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnZHknOiAnNDBweCcsXHJcbiAgICAgICAgICAgICd4JzogJzEwJyxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ21vbnRoX3RpY2tfeWVhcidcclxuICAgICAgICB9KVxyXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKXsgcmV0dXJuIGQueWVhciB9KTtcclxuXHJcbiAgICAvLyBjb3B5IG1vbnRoIHRpY2tzIHRvIHRoZSBtb250aCB0aWxlXHJcbiAgICBtb250aFRpbGUubm9kZSgpLmFwcGVuZENoaWxkKGNoYXJ0LnNlbGVjdCgnZy5tb250aF90aWNrcycpLm5vZGUoKS5jbG9uZU5vZGUodHJ1ZSkpO1xyXG5cclxuICAgIHRoaXMudGlsZU1vbnRoVGlja3MgPSBtb250aFRpbGUuc2VsZWN0QWxsKCcubW9udGhfdGljaycpO1xyXG5cclxuICAgIHRoaXMudGlsZU1vbnRoVGlja3MuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCAwKScpO1xyXG5cclxuICAgIHRoaXMubW9udGhUaWNrcyA9IGNoYXJ0LnNlbGVjdEFsbCgnLm1vbnRoX3RpY2snKTtcclxuXHJcblxyXG4gICAgLy8gZ2V0IG5lc3NhY2VyeSB0aWNrcyBkZXRhaWxzXHJcbiAgICB0aGlzLm1vbnRoVGlja3NPZmZzZXRzID0gbW9udGhzRGF0YS5tYXAoZnVuY3Rpb24gKGl0ZW0sIGksIGFycil7XHJcbiAgICAgICAgdmFyIG5leHQgPSBhcnJbaSArIDFdLFxyXG4gICAgICAgICAgICBlZGdlID0gbmV4dCA/IG5leHQub2Zmc2V0IDogdGhpcy5jaGFydFdpZHRoO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBvZmZzZXQ6IGl0ZW0ub2Zmc2V0LFxyXG4gICAgICAgICAgICBlZGdlOiBlZGdlXHJcbiAgICAgICAgfTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcblxyXG4gICAgLy8gcGxhY2UgdGhlIHJpZ2h0IHRpbGVcclxuICAgIHRoaXMuY3VycmVudFRpbGVJbmRleCA9IG51bGw7XHJcbiAgICB0aGlzLl9wbGFjZVRpbGUoc2Nyb2xsTGVmdCk7XHJcbn07XHJcblxyXG5DaGFydC5wcm90b3R5cGUuX3BsYWNlVGlsZSA9IGZ1bmN0aW9uIChzY3JvbGxMZWZ0KXtcclxuICAgIHZhciByaWdodFRpbGVJbmRleCA9IDAsXHJcbiAgICAgICAgY3VycmVudFRpbGVEZXRhaWxzO1xyXG5cclxuICAgIHRoaXMubW9udGhUaWNrc09mZnNldHMuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSwgaSl7XHJcbiAgICAgICAgaWYgKCBzY3JvbGxMZWZ0ID49IGl0ZW0ub2Zmc2V0ICYmIHNjcm9sbExlZnQgPD0gaXRlbS5lZGdlICkge1xyXG4gICAgICAgICAgICByaWdodFRpbGVJbmRleCA9IGk7XHJcbiAgICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCB0aGlzLmN1cnJlbnRUaWxlSW5kZXggIT09IHJpZ2h0VGlsZUluZGV4ICkge1xyXG4gICAgICAgIHRoaXMubW9udGhUaWNrcy5jbGFzc2VkKCdoaWRkZW4nLCBmYWxzZSkuZmlsdGVyKCc6bnRoLWNoaWxkKCcrIChyaWdodFRpbGVJbmRleCsxKSArJyknKS5jbGFzc2VkKCdoaWRkZW4nLCB0cnVlKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50VGlsZSA9IHRoaXMudGlsZU1vbnRoVGlja3MuZmlsdGVyKCc6bnRoLWNoaWxkKCcrIChyaWdodFRpbGVJbmRleCsxKSArJyknKTtcclxuXHJcbiAgICAgICAgdGhpcy50aWxlTW9udGhUaWNrcy5jbGFzc2VkKCdoaWRkZW4nLCB0cnVlKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50VGlsZS5jbGFzc2VkKCdoaWRkZW4nLCBmYWxzZSk7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFRpbGVJbmRleCA9IHJpZ2h0VGlsZUluZGV4O1xyXG4gICAgfVxyXG5cclxuICAgIGN1cnJlbnRUaWxlRGV0YWlscyA9IHRoaXMubW9udGhUaWNrc09mZnNldHNbdGhpcy5jdXJyZW50VGlsZUluZGV4XTtcclxuXHJcbiAgICBpZiAoIHNjcm9sbExlZnQgPiAoY3VycmVudFRpbGVEZXRhaWxzLmVkZ2UgLSAyMDApICkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFRpbGUuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKGN1cnJlbnRUaWxlRGV0YWlscy5lZGdlIC0gKHNjcm9sbExlZnQgKyAyMDApKSArICcsIDApJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuY3VycmVudFRpbGUuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCAwKScpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLmdldENoYXJ0RGF0YSA9IGZ1bmN0aW9uICgpe1xyXG4gICAgLy8gZ2V0IGFuIGFycmF5IG9mIGtleS12YWx1ZSBvYmplY3RzXHJcbiAgICB2YXIgZGF0YUhhc2ggPSB0aGlzLmRhdGFbY29uZmlnLnZpZGVvXVtjb25maWcuYWN0aXZpdHldLFxyXG4gICAgICAgIGRhdGEgPSBkMy5tYXAoZGF0YUhhc2gpLmVudHJpZXMoKTtcclxuXHJcbiAgICAvLyBwYXJzZSBkYXRlIHN0cmluZ3NcclxuICAgIGRhdGEuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSl7XHJcbiAgICAgICAgaXRlbS5rZXkgPSBuZXcgRGF0ZShpdGVtLmtleSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBzb3J0IGRhdGEgYnkgZGF0ZVxyXG4gICAgZGF0YSA9IGRhdGEuc29ydChmdW5jdGlvbiAoYSwgYil7XHJcbiAgICAgICAgdmFyIGFUaW1lID0gYS5rZXkuZ2V0VGltZSgpLFxyXG4gICAgICAgICAgICBiVGltZSA9IGIua2V5LmdldFRpbWUoKTtcclxuICAgICAgICByZXR1cm4gYVRpbWUgLSBiVGltZTtcclxuICAgIH0pO1xyXG5cclxuICAgIGlmICggY29uZmlnLnBlcmlvZCA9PT0gJ2RhaWx5JyApIHtcclxuICAgICAgICAvLyBtYWtlIGRhaWx5IHZhbHVlc1xyXG4gICAgICAgIGRhdGEgPSBkYXRhLm1hcChmdW5jdGlvbiAoaXRlbSwgaSl7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB7IGtleTogaXRlbS5rZXkgfTtcclxuXHJcbiAgICAgICAgICAgIGlmICggaSA+IDAgKXtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IGl0ZW0udmFsdWUgLSBkYXRhW2kgLSAxXS52YWx1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IGl0ZW0udmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZGF0YTtcclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9nZXRUb3BWYWx1ZSA9IGZ1bmN0aW9uIChkYXRhKXtcclxuICAgIHZhciB2YWx1ZSA9IGQzLm1heChkYXRhLCBmdW5jdGlvbiAoaXRlbSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGRpZ2l0c0xlbmd0aCA9IHZhbHVlLnRvU3RyaW5nKCkubGVuZ3RoLFxyXG4gICAgICAgIHplcm9zTnVtYmVyID0gZGlnaXRzTGVuZ3RoIC0gMSxcclxuICAgICAgICB0ZXN0TnVtYmVyID0gJzEnLFxyXG4gICAgICAgIG1heCA9IDAsXHJcbiAgICAgICAgcmVzaWR1ZTtcclxuXHJcbiAgICBpZiAoIGRpZ2l0c0xlbmd0aCA8PSAxICl7XHJcbiAgICAgICAgbWF4ID0gMTA7XHJcbiAgICAgICAgcmV0dXJuIG1heDtcclxuICAgIH1cclxuXHJcbiAgICB3aGlsZSAoIHplcm9zTnVtYmVyICkge1xyXG4gICAgICAgIHRlc3ROdW1iZXIgKz0gJzAnO1xyXG4gICAgICAgIHplcm9zTnVtYmVyLS07XHJcbiAgICB9XHJcbiAgICB0ZXN0TnVtYmVyID0gK3Rlc3ROdW1iZXI7XHJcblxyXG4gICAgcmVzaWR1ZSA9IHZhbHVlICUgdGVzdE51bWJlcjtcclxuICAgIHJvdW5kZWQgPSB2YWx1ZSArICh0ZXN0TnVtYmVyIC0gcmVzaWR1ZSk7XHJcblxyXG4gICAgaWYgKCB2YWx1ZSA8IDEwMCApe1xyXG4gICAgICAgIHJvdW5kZWQgPSByb3VuZGVkLnRvU3RyaW5nKCkuc3BsaXQoJycpO1xyXG4gICAgICAgIHJvdW5kZWRbMF0gPSArcm91bmRlZFswXSA+IDUgPyAnMTAnOiAnNSc7XHJcbiAgICAgICAgbWF4ID0gKyhyb3VuZGVkLmpvaW4oJycpKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbWF4ID0gcm91bmRlZDtcclxuICAgIH1cclxuICAgIHJldHVybiBtYXg7XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoZGF0YSl7XHJcbiAgICB2YXIgeSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMCwgdGhpcy5fZ2V0VG9wVmFsdWUoZGF0YSldKS5yYW5nZShbaGVpZ2h0LCAwXSksXHJcbiAgICAgICAgc2NhbGVEYXRhID0geS50aWNrcyg0KS5tYXAoeS50aWNrRm9ybWF0KDQsIFwiZFwiKSksXHJcbiAgICAgICAgY2hhcnRXaWR0aCA9IGRhdGEubGVuZ3RoICogYmFyV2lkdGgsXHJcbiAgICAgICAgbW9udGhzRGF0YSA9IHRoaXMuX2dldE1vbnRoc0RhdGEoZGF0YSk7XHJcblxyXG5cclxuICAgIC8vIHNldCB0aGUgY2FudmFzIHdpZHRoXHJcbiAgICBjaGFydC5hdHRyKCd3aWR0aCcsIGNoYXJ0V2lkdGgpO1xyXG5cclxuICAgIHRoaXMuY2hhcnRXaWR0aCA9IGNoYXJ0V2lkdGg7XHJcblxyXG4gICAgLy8gY2xlYXIgY2FudmFzXHJcbiAgICBjaGFydC5zZWxlY3RBbGwoJyonKS5yZW1vdmUoKTtcclxuICAgIGQzLnNlbGVjdCgnI21vbnRoX3RpbGUnKS5zZWxlY3QoJ3N2ZycpLnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xyXG5cclxuICAgIGNoYXJ0LmFwcGVuZCgnbGluZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAneDEnOiAwLFxyXG4gICAgICAgICAgICAneTEnOiBoZWlnaHQsXHJcbiAgICAgICAgICAgICd4Mic6IGNoYXJ0V2lkdGgsXHJcbiAgICAgICAgICAgICd5Mic6IGhlaWdodCxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ3RpbWVsaW5lJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIC8vIGRyYXcgbW9udGggdGlja3NcclxuICAgIHRoaXMuX2RyYXdNb250aFRpY2tzKG1vbnRoc0RhdGEpO1xyXG5cclxuICAgIC8vIGRyYXcgc2NhbGVcclxuICAgIHNjYWxlLnNlbGVjdCgnZycpLnJlbW92ZSgpO1xyXG5cclxuICAgIHNjYWxlLmFwcGVuZCgnZycpXHJcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2F4aXMnKVxyXG4gICAgICAgIC5jYWxsKGQzLnN2Zy5heGlzKClcclxuICAgICAgICAgICAgLnNjYWxlKHkpXHJcbiAgICAgICAgICAgIC5vcmllbnQoJ3JpZ2h0JylcclxuICAgICAgICAgICAgLnRpY2tzKDQpXHJcbiAgICAgICAgICAgIC50aWNrRm9ybWF0KCBkMy5mb3JtYXQoJ3MnKSApICk7XHJcblxyXG4gICAgLy8gZHJhdyBiYXJzXHJcbiAgICBpZiAoIGNvbmZpZy5wZXJpb2QgPT09ICdkYWlseScgKXtcclxuICAgICAgICB0aGlzLl9kcmF3RGFpbHlCYXJzKGRhdGEsIHkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLl9kcmF3R3Jvc3NCYXJzKGRhdGEsIHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG5DaGFydC5wcm90b3R5cGUuX2RyYXdEYWlseUJhcnMgPSBmdW5jdGlvbiAoZGF0YSwgeSkge1xyXG4gICAgdmFyIGJhciA9IGNoYXJ0LnNlbGVjdEFsbCgnZy5iYXInKVxyXG4gICAgICAgIC5kYXRhKGRhdGEpXHJcbiAgICAgICAgLmVudGVyKClcclxuICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBpICogYmFyV2lkdGggKyAnLCAwKSc7IH0sXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdiYXInXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgncmVjdCcpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnc2hhcGUtcmVuZGVyaW5nJzogJ2NyaXNwRWRnZXMnLFxyXG4gICAgICAgICAgICAnZmlsbCc6ICdyZ2JhKDU3LCAxODYsIDEzMCwgMC4zKScsXHJcbiAgICAgICAgICAgICd3aWR0aCc6IGJhcldpZHRoLFxyXG4gICAgICAgICAgICAnaGVpZ2h0JzogMCxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2Jhcl/RgW9sdW1uJyxcclxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoMCwnKyBoZWlnaHQgKycpJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRyYW5zaXRpb24oKVxyXG4gICAgICAgIC5kdXJhdGlvbig1MDApXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnaGVpZ2h0JzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGhlaWdodCAtIHkoZC52YWx1ZSk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbiAoZCwgaSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoMCwnKyB5KGQudmFsdWUpICsgJyknO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgncmVjdCcpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnc2hhcGUtcmVuZGVyaW5nJzogJ2NyaXNwRWRnZXMnLFxyXG4gICAgICAgICAgICAnZmlsbCc6ICdyZ2JhKDU3LCAxODYsIDEzMCwgMSknLFxyXG4gICAgICAgICAgICAnd2lkdGgnOiBiYXJXaWR0aCxcclxuICAgICAgICAgICAgJ2hlaWdodCc6IDIsXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdiYXJfY29sdW1uX2hlYWQnLFxyXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgwLCcrIGhlaWdodCArICcpJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRyYW5zaXRpb24oKVxyXG4gICAgICAgIC5kdXJhdGlvbig1MDApXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogZnVuY3Rpb24gKGQsIGkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKDAsJysgeShkLnZhbHVlKSArICcpJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ3ZhbHVlJyxcclxuICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICd5JzogaGVpZ2h0LFxyXG4gICAgICAgICAgICAnZmlsbC1vcGFjaXR5JzogMFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSlcclxuICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgLmR1cmF0aW9uKDUwMClcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd5JzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHkoZC52YWx1ZSkgLSA1O1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAnZmlsbC1vcGFjaXR5JzogMVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHRoaXMuYmFyID0gYmFyO1xyXG5cclxuICAgIHRoaXMuX2RyYXdUaW1lbGluZShiYXIpO1xyXG59XHJcblxyXG5DaGFydC5wcm90b3R5cGUuX2RyYXdHcm9zc0JhcnMgPSBmdW5jdGlvbiAoZGF0YSwgeSl7XHJcbiAgICB2YXIgYXJlYSA9IGQzLnN2Zy5hcmVhKClcclxuICAgICAgICAuaW50ZXJwb2xhdGUoJ21vbm90b25lJylcclxuICAgICAgICAueChmdW5jdGlvbihkLCBpKSB7IHJldHVybiBpICogYmFyV2lkdGggKyAoYmFyV2lkdGggLyAyKTsgfSlcclxuICAgICAgICAueTAoaGVpZ2h0KVxyXG4gICAgICAgIC55MShmdW5jdGlvbihkLCBpKSB7IHJldHVybiB5KGQudmFsdWUpOyB9KTtcclxuXHJcbiAgICBjaGFydC5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAgIC5kYXR1bShkYXRhKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2FyZWEnLFxyXG4gICAgICAgICAgICAnZCc6IGFyZWFcclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgdmFyIGxpbmUgPSBkMy5zdmcubGluZSgpXHJcbiAgICAgICAgLngoZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gaSAqIGJhcldpZHRoICsgKGJhcldpZHRoIC8gMik7IH0pXHJcbiAgICAgICAgLnkoZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4geShkLnZhbHVlKTsgfSlcclxuICAgICAgICAuaW50ZXJwb2xhdGUoJ2xpbmVhcicpO1xyXG5cclxuICAgIGNoYXJ0LmFwcGVuZCgncGF0aCcpXHJcbiAgICAgICAgLmRhdHVtKGRhdGEpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAnY3VydmUnLFxyXG4gICAgICAgICAgICAnZCc6IGxpbmVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB2YXIgYmFyID0gY2hhcnQuc2VsZWN0QWxsKCdnLmJhcicpXHJcbiAgICAgICAgLmRhdGEoZGF0YSlcclxuICAgICAgICAuZW50ZXIoKVxyXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuICd0cmFuc2xhdGUoJyArIGkgKiBiYXJXaWR0aCArICcsIDApJzsgfSxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2JhciBncm9zc19iYXInXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAndmFsdWUnLFxyXG4gICAgICAgICAgICAneCc6IGJhcldpZHRoIC8gMixcclxuICAgICAgICAgICAgJ3knOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geShkLnZhbHVlKSAtIDIwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICAudGV4dChmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgIHJldHVybiBkLnZhbHVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5vbignbW91c2VvdmVyJywgZnVuY3Rpb24gKCl7XHJcbiAgICAgICAgICAgIHZhciB0YXJnZXQgPSBkMy5zZWxlY3QodGhpcyksXHJcbiAgICAgICAgICAgICAgICBjaXJjbGUgPSB0YXJnZXQuc2VsZWN0KCcuY2lyY2xlJyksXHJcbiAgICAgICAgICAgICAgICBjaXJjbGVTdHJva2UgPSB0YXJnZXQuc2VsZWN0KCcuY2lyY2xlX3N0cm9rZScpLFxyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB0YXJnZXQuc2VsZWN0KCcudmFsdWUnKTtcclxuXHJcbiAgICAgICAgICAgIGNpcmNsZVN0cm9rZS5hdHRyKHtcclxuICAgICAgICAgICAgICAgICdyJzogOFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGNpcmNsZS5hdHRyKHtcclxuICAgICAgICAgICAgICAgICdyJzogNlxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRhcmdldC5jbGFzc2VkKCdob3ZlcicsIHRydWUpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLm9uKCdtb3VzZW91dCcsIGZ1bmN0aW9uICgpe1xyXG4gICAgICAgICAgICB2YXIgdGFyZ2V0ID0gZDMuc2VsZWN0KHRoaXMpLFxyXG4gICAgICAgICAgICAgICAgY2lyY2xlID0gdGFyZ2V0LnNlbGVjdCgnLmNpcmNsZScpLFxyXG4gICAgICAgICAgICAgICAgY2lyY2xlU3Ryb2tlID0gdGFyZ2V0LnNlbGVjdCgnLmNpcmNsZV9zdHJva2UnKSxcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gdGFyZ2V0LnNlbGVjdCgnLnZhbHVlJyk7XHJcblxyXG4gICAgICAgICAgICBjaXJjbGVTdHJva2UuYXR0cih7XHJcbiAgICAgICAgICAgICAgICAncic6IDZcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBjaXJjbGUuYXR0cih7XHJcbiAgICAgICAgICAgICAgICAncic6IDRcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0YXJnZXQuY2xhc3NlZCgnaG92ZXInLCBmYWxzZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdjaXJjbGVfc3Ryb2tlJyxcclxuICAgICAgICAgICAgJ3InOiA2LFxyXG4gICAgICAgICAgICAnY3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICdjeSc6IGZ1bmN0aW9uIChkKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHkoZC52YWx1ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdjaXJjbGUnLFxyXG4gICAgICAgICAgICAncic6IDQsXHJcbiAgICAgICAgICAgICdjeCc6IGJhcldpZHRoIC8gMixcclxuICAgICAgICAgICAgJ2N5JzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQoeShkLnZhbHVlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcblxyXG4gICAgdGhpcy5fZHJhd1RpbWVsaW5lKGJhcik7XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZHJhd1RpbWVsaW5lID0gZnVuY3Rpb24gKGJhcil7XHJcbiAgICB2YXIgbGluZUhlaWdodCA9IDU7XHJcbiAgICAvLyBkYXlzXHJcbiAgICBiYXIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd4JzogYmFyV2lkdGggLyAyLFxyXG4gICAgICAgICAgICAneSc6IGhlaWdodCArIDE1LFxyXG4gICAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGF5ID0gZC5rZXkuZ2V0RGF5KCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRheSA9PT0gMCB8fCBkYXkgPT09IDYpICYmIGNvbmZpZy5zaG93V2Vla2RheXMgPyAnZGF0ZSBob2xpZGF5JzogJ2RhdGUnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICAudGV4dCggZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgICAgIHJldHVybiBkLmtleS5nZXREYXRlKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgLy8gd2Vla2RheXNcclxuICAgIGlmICggY29uZmlnLnNob3dXZWVrZGF5cyApIHtcclxuICAgICAgICBiYXIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICAgICAneSc6IGhlaWdodCArIDMwLFxyXG4gICAgICAgICAgICAgICAgJ2NsYXNzJzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF5ID09PSAwIHx8IGRheSA9PT0gNiA/ICd3ZWVrZGF5IGhvbGlkYXknOiAnd2Vla2RheSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50ZXh0KCBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB3ZWVrZGF5c1tkYXldO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGluZUhlaWdodCA9IDMwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRpdmlkZXJcclxuICAgIGJhci5hcHBlbmQoJ2xpbmUnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3gxJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICd5MSc6IGhlaWdodCxcclxuICAgICAgICAgICAgJ3gyJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICd5Mic6IGhlaWdodCArIGxpbmVIZWlnaHQsXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICd0aW1lbGluZSdcclxuICAgICAgICB9KTtcclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLnJlc2V0VmFsdWVzID0gZnVuY3Rpb24gKGNhbGxiYWNrKXtcclxuICAgIHZhciBkdXJhdGlvbiA9IDI1MCxcclxuICAgICAgICB0aW1lciA9IG51bGw7XHJcblxyXG4gICAgaWYgKCBjb25maWcucGVyaW9kID09PSAnZGFpbHknICkge1xyXG4gICAgICAgIHRoaXMuYmFyLnNlbGVjdEFsbCgnLmJhcl9jb2x1bW5faGVhZCcpXHJcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcclxuICAgICAgICAgICAgLmR1cmF0aW9uKGR1cmF0aW9uKVxyXG4gICAgICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgwLCcrIGhlaWdodCArICcpJ1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5iYXIuc2VsZWN0QWxsKCcuYmFyX9GBb2x1bW4nKVxyXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcclxuICAgICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoMCwnKyBoZWlnaHQgKyAnKScsXHJcbiAgICAgICAgICAgICAgICAnaGVpZ2h0JzogMFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5iYXIuc2VsZWN0QWxsKCcudmFsdWUnKVxyXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcclxuICAgICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3knOiBoZWlnaHQsXHJcbiAgICAgICAgICAgICAgICAnZmlsbC1vcGFjaXR5JzogMFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuZWFjaCgnZW5kJywgZnVuY3Rpb24gKCl7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xyXG4gICAgICAgICAgICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KGNhbGxiYWNrLCAxMDApO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY2FsbGJhY2soKTtcclxuICAgIH1cclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLmNoYW5nZVZpZGVvID0gZnVuY3Rpb24gKHZhbHVlKXtcclxuXHJcbiAgICB0aGlzLnJlc2V0VmFsdWVzKGZ1bmN0aW9uICgpe1xyXG4gICAgICAgIGNvbmZpZy52aWRlbyA9IHZhbHVlO1xyXG4gICAgICAgIHZhciBjaGFydERhdGEgPSB0aGlzLmdldENoYXJ0RGF0YSgpXHJcbiAgICAgICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5DaGFydC5wcm90b3R5cGUuY2hhbmdlQWN0aXZpdHkgPSBmdW5jdGlvbiAodmFsdWUpe1xyXG5cclxuICAgIHRoaXMucmVzZXRWYWx1ZXMoZnVuY3Rpb24gKCl7XHJcbiAgICAgICAgY29uZmlnLmFjdGl2aXR5ID0gdmFsdWU7XHJcbiAgICAgICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKClcclxuICAgICAgICB0aGlzLnJlbmRlcihjaGFydERhdGEpO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5jaGFuZ2VQZXJpb2QgPSBmdW5jdGlvbiAodmFsdWUpe1xyXG4gICAgY29uZmlnLnBlcmlvZCA9IHZhbHVlO1xyXG4gICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKCk7XHJcblxyXG4gICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhcnQ7XHJcbiIsInZhciBDaGFydCA9IHJlcXVpcmUoJy4vY2hhcnQnKSxcclxuICAgIGNoYXJ0ID0gbmV3IENoYXJ0KCksXHJcbiAgICB2aWRlb1NlbGVjdCA9IGQzLnNlbGVjdCgnI3ZpZGVvX3NlbGVjdCcpLFxyXG4gICAgc3dpdGNoZXJzID0gZDMuc2VsZWN0QWxsKCcuc3dpdGNoZXInKTtcclxuXHJcbmZ1bmN0aW9uIENvbnRyb2xsZXIgKCl7XHJcbiAgICAvLyBtYWtlIHRoaXMgY2xhc3MgYSBzaW5nbGV0b25cclxuICAgIGlmICggYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgKSB7XHJcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgPSB0aGlzO1xyXG59XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKGRhdGEpe1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdGhpcy5kYXRhID0gZGF0YTtcclxuXHJcbiAgICB0aGlzLnZpZGVvU2VsZWN0ID0gdmlkZW9TZWxlY3Q7XHJcblxyXG4gICAgdGhpcy5fZmlsbFZpZGVvU2VsZWN0KCk7XHJcbiAgICAvLyBhdHRhY2ggZXZlbnRzXHJcbiAgICBzd2l0Y2hlcnMuc2VsZWN0QWxsKCdzcGFuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpe1xyXG4gICAgICAgIHZhciB0YXJnZXQgPSBkMy5zZWxlY3QodGhpcyksXHJcbiAgICAgICAgICAgIHBhcmVudCA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLFxyXG4gICAgICAgICAgICBhY3Rpb24gPSB0aGlzLnBhcmVudE5vZGUuZGF0YXNldC5hY3Rpb24sXHJcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5kYXRhc2V0LnZhbHVlO1xyXG5cclxuICAgICAgICBwYXJlbnQuc2VsZWN0QWxsKCdzcGFuJykuY2xhc3NlZCgnYWN0aXZlJywgZmFsc2UpO1xyXG4gICAgICAgIHRhcmdldC5jbGFzc2VkKCdhY3RpdmUnLCB0cnVlKTtcclxuXHJcbiAgICAgICAgc2VsZlthY3Rpb25dKHZhbHVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHZpZGVvU2VsZWN0Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSl7XHJcbiAgICAgICAgdmFyIHZpZGVvSW5kZXggPSArdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgY2hhcnQuY2hhbmdlVmlkZW8odmlkZW9JbmRleCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLl9maWxsVmlkZW9TZWxlY3QgPSBmdW5jdGlvbiAoKXtcclxuICAgIHZhciB2aWRlb05hbWVzID0gdGhpcy5kYXRhLm1hcChmdW5jdGlvbiAoaXRlbSwgaSl7IHJldHVybiBpdGVtLm5hbWU7IH0pLFxyXG4gICAgICAgIHZpZGVvVXBkYXRlID0gdmlkZW9TZWxlY3Quc2VsZWN0QWxsKCdvcHRpb25zJykuZGF0YSh2aWRlb05hbWVzKTtcclxuXHJcbiAgICB2aWRlb1VwZGF0ZVxyXG4gICAgLmVudGVyKClcclxuICAgIC5hcHBlbmQoJ29wdGlvbicpXHJcbiAgICAudGV4dChmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgcmV0dXJuIGQ7XHJcbiAgICB9KVxyXG4gICAgLmF0dHIoJ3ZhbHVlJywgZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgIHJldHVybiB2aWRlb05hbWVzLmluZGV4T2YoZCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN3aXRjaEFjdGl2aXR5ID0gZnVuY3Rpb24gKHZhbHVlKXtcclxuICAgIGNoYXJ0LmNoYW5nZUFjdGl2aXR5KHZhbHVlKTtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN3aXRjaFBlcmlvZCA9IGZ1bmN0aW9uICh2YWx1ZSl7XHJcbiAgICBjaGFydC5jaGFuZ2VQZXJpb2QodmFsdWUpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyOyJdfQ==
