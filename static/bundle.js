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
            'class': 'bar'
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
            .transition(function (){
                console.log(1);
            })
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaXZhbi55dW5kYVxcQXBwRGF0YVxcUm9hbWluZ1xcbnBtXFxub2RlX21vZHVsZXNcXHdhdGNoaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL2FwcC5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL2NoYXJ0LmpzIiwiRDovbWF2ZW5zLXNvY2lhbC1pbnRlcmFjdGlvbnMvanMvY29udHJvbGxlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVnQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENoYXJ0ID0gcmVxdWlyZSgnLi9jaGFydCcpLFxyXG4gICAgQ29udG9sbGVyID0gcmVxdWlyZSgnLi9jb250cm9sbGVyJyk7XHJcblxyXG4vLyByZXRyaWV2ZSBkYXRhXHJcbmQzLmpzb24oJy4vZGF0YS5qc29uJywgaW5pdCk7XHJcblxyXG5mdW5jdGlvbiBpbml0IChlcnIsIGRhdGEpe1xyXG4gICAgdmFyIGNvbnRvbGxlciA9IG5ldyBDb250b2xsZXIoKSxcclxuICAgICAgICBjaGFydCA9IG5ldyBDaGFydCgpO1xyXG5cclxuICAgIGNvbnRvbGxlci5pbml0KGRhdGEpO1xyXG4gICAgY2hhcnQuaW5pdChkYXRhKTtcclxuXHJcbn0iLCJ2YXIgaGVpZ2h0ID0gMzAwLFxyXG4gICAgYmFyV2lkdGggPSA0MCxcclxuICAgIHNjcm9sbFdyYXBwZXIgPSBkMy5zZWxlY3QoJy5zY3JvbGxfd3JhcHBlcicpLFxyXG4gICAgY2hhcnQgPSBkMy5zZWxlY3QoJyNjaGFydCcpLmFwcGVuZCgnc3ZnJykuYXR0cignaGVpZ2h0JywgaGVpZ2h0ICsgNDApLFxyXG4gICAgc2NhbGUgPSBkMy5zZWxlY3QoJyNzY2FsZScpLmFwcGVuZCgnc3ZnJykuYXR0cih7ICdoZWlnaHQnOiBoZWlnaHQgKyAyMCwgJ3dpZHRoJzo2MCB9KSxcclxuICAgIG1vbnRoVGlsZSA9IGQzLnNlbGVjdCgnI21vbnRoX3RpbGUnKS5hcHBlbmQoJ3N2ZycpLmF0dHIoeyAnaGVpZ2h0JzogaGVpZ2h0LCAnd2lkdGgnOiAyMDAgfSksXHJcbiAgICBtb250aHMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXSxcclxuICAgIHdlZWtkYXlzID0gWydTVU4nLCAnTU9OJywgJ1RVRScsICdXRUQnLCAnVEhVJywgJ0ZSSScsICdTQVQnXSxcclxuXHJcbiAgICAvLyBkZWZhdWx0IGNvbmZpZ1xyXG4gICAgY29uZmlnID0ge1xyXG4gICAgICAgIHZpZGVvOiAwLFxyXG4gICAgICAgIGFjdGl2aXR5OiAndmlld3MnLFxyXG4gICAgICAgIHBlcmlvZDogJ2RhaWx5JyxcclxuICAgICAgICBzaG93V2Vla2RheXM6IHRydWVcclxuICAgIH07XHJcblxyXG5cclxuLy8gY29uc3RydWN0b3JcclxuZnVuY3Rpb24gQ2hhcnQgKCl7XHJcbiAgICAvLyBtYWtlIHRoaXMgY2xhc3MgYSBzaW5nbGV0b25cclxuICAgIGlmICggYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgKSB7XHJcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgPSB0aGlzO1xyXG5cclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoZGF0YSl7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xyXG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XHJcblxyXG4gICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKCk7XHJcbiAgICB0aGlzLm1vbnRoVGlja3NPZmZzZXRzID0gW107XHJcblxyXG4gICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcclxuXHJcbiAgICBzY3JvbGxXcmFwcGVyLm9uKCdzY3JvbGwnLCBmdW5jdGlvbiAoKXtcclxuICAgICAgICB2YXIgc2Nyb2xsTGVmdCA9IHRoaXMuc2Nyb2xsTGVmdDtcclxuXHJcbiAgICAgICAgc2VsZi5fcGxhY2VUaWxlKHNjcm9sbExlZnQpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5DaGFydC5wcm90b3R5cGUuX2dldE1vbnRoc0RhdGEgPSBmdW5jdGlvbiAoY2hhcnREYXRhKXtcclxuICAgIHZhciBtb250aHNEYXRhID0gW107XHJcblxyXG4gICAgLy8gZmlsbCBtb250aHMgZGF0YVxyXG4gICAgY2hhcnREYXRhLmZvckVhY2goKGZ1bmN0aW9uICgpe1xyXG4gICAgICAgIHZhciBjdXJyZW50TW9udGggPSAnJztcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGl0ZW0sIGkpe1xyXG4gICAgICAgICAgICAvLyB1c2UgZDMudGltZS5mb3JtYXQoXCIlYiAlWVwiKS5wYXJzZTtcclxuICAgICAgICAgICAgdmFyIG1vbnRoID0gbW9udGhzW2l0ZW0ua2V5LmdldE1vbnRoKCldLFxyXG4gICAgICAgICAgICAgICAgeWVhciA9ICBpdGVtLmtleS5nZXRGdWxsWWVhcigpLFxyXG4gICAgICAgICAgICAgICAgbW9udGhTdHJpbmcgPSBtb250aHNbaXRlbS5rZXkuZ2V0TW9udGgoKV0gKyAnICcgKyBpdGVtLmtleS5nZXRGdWxsWWVhcigpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCBtb250aFN0cmluZyAhPT0gY3VycmVudE1vbnRoICkge1xyXG4gICAgICAgICAgICAgICAgbW9udGhzRGF0YS5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBtb250aFN0cmluZzogbW9udGhTdHJpbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgbW9udGg6IG1vbnRoLFxyXG4gICAgICAgICAgICAgICAgICAgIHllYXI6IHllYXIsXHJcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBpICogYmFyV2lkdGhcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGN1cnJlbnRNb250aCA9IG1vbnRoU3RyaW5nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfSkoKSk7XHJcblxyXG4gICAgcmV0dXJuIG1vbnRoc0RhdGE7XHJcbn07XHJcblxyXG5DaGFydC5wcm90b3R5cGUuX2RyYXdNb250aFRpY2tzID0gZnVuY3Rpb24gKG1vbnRoc0RhdGEpe1xyXG4gICAgdmFyIHNjcm9sbExlZnQgPSBzY3JvbGxXcmFwcGVyLm5vZGUoKS5zY3JvbGxMZWZ0LFxyXG4gICAgICAgIG1vbnRoVGlja3MgPSBjaGFydC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgIC5hdHRyKHsgJ2NsYXNzJzogJ21vbnRoX3RpY2tzJyB9KTtcclxuXHJcbiAgICB2YXIgbW9udGhUaWNrID0gbW9udGhUaWNrcy5zZWxlY3RBbGwoJ2cubW9udGhfdGljaycpXHJcbiAgICAgICAgLmRhdGEobW9udGhzRGF0YSlcclxuICAgICAgICAuZW50ZXIoKVxyXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuICd0cmFuc2xhdGUoJyArIGQub2Zmc2V0ICsgJywgMCknOyB9LFxyXG4gICAgICAgICAgICAnY2xhc3MnOiAnbW9udGhfdGljaydcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBtb250aFRpY2suYXBwZW5kKCdsaW5lJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd4MSc6IDAsXHJcbiAgICAgICAgICAgICd5MSc6IDAsXHJcbiAgICAgICAgICAgICd4Mic6IDAsXHJcbiAgICAgICAgICAgICd5Mic6IGhlaWdodFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHZhciBtb250aFRleHQgPSBtb250aFRpY2suYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAuYXR0cih7ICd4JzogMTAsICd5JzogMCB9KTtcclxuXHJcbiAgICBtb250aFRleHQuYXBwZW5kKCd0c3BhbicpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnZHknOiAnNDBweCcsXHJcbiAgICAgICAgICAgICd4JzogJzEwJyxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ21vbnRoX3RpY2tfbW9udGgnXHJcbiAgICAgICAgfSlcclxuICAgICAgICAudGV4dChmdW5jdGlvbiAoZCl7IHJldHVybiBkLm1vbnRoIH0pO1xyXG5cclxuICAgIG1vbnRoVGV4dC5hcHBlbmQoJ3RzcGFuJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdkeSc6ICc0MHB4JyxcclxuICAgICAgICAgICAgJ3gnOiAnMTAnLFxyXG4gICAgICAgICAgICAnY2xhc3MnOiAnbW9udGhfdGlja195ZWFyJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpeyByZXR1cm4gZC55ZWFyIH0pO1xyXG5cclxuICAgIC8vIGNvcHkgbW9udGggdGlja3MgdG8gdGhlIG1vbnRoIHRpbGVcclxuICAgIG1vbnRoVGlsZS5ub2RlKCkuYXBwZW5kQ2hpbGQoY2hhcnQuc2VsZWN0KCdnLm1vbnRoX3RpY2tzJykubm9kZSgpLmNsb25lTm9kZSh0cnVlKSk7XHJcblxyXG4gICAgdGhpcy50aWxlTW9udGhUaWNrcyA9IG1vbnRoVGlsZS5zZWxlY3RBbGwoJy5tb250aF90aWNrJyk7XHJcblxyXG4gICAgdGhpcy50aWxlTW9udGhUaWNrcy5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKDAsIDApJyk7XHJcblxyXG4gICAgdGhpcy5tb250aFRpY2tzID0gY2hhcnQuc2VsZWN0QWxsKCcubW9udGhfdGljaycpO1xyXG5cclxuXHJcbiAgICAvLyBnZXQgbmVzc2FjZXJ5IHRpY2tzIGRldGFpbHNcclxuICAgIHRoaXMubW9udGhUaWNrc09mZnNldHMgPSBtb250aHNEYXRhLm1hcChmdW5jdGlvbiAoaXRlbSwgaSwgYXJyKXtcclxuICAgICAgICB2YXIgbmV4dCA9IGFycltpICsgMV0sXHJcbiAgICAgICAgICAgIGVkZ2UgPSBuZXh0ID8gbmV4dC5vZmZzZXQgOiB0aGlzLmNoYXJ0V2lkdGg7XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG9mZnNldDogaXRlbS5vZmZzZXQsXHJcbiAgICAgICAgICAgIGVkZ2U6IGVkZ2VcclxuICAgICAgICB9O1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICAvLyBwbGFjZSB0aGUgcmlnaHQgdGlsZVxyXG4gICAgdGhpcy5jdXJyZW50VGlsZUluZGV4ID0gbnVsbDtcclxuICAgIHRoaXMuX3BsYWNlVGlsZShzY3JvbGxMZWZ0KTtcclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fcGxhY2VUaWxlID0gZnVuY3Rpb24gKHNjcm9sbExlZnQpe1xyXG4gICAgdmFyIHJpZ2h0VGlsZUluZGV4ID0gMCxcclxuICAgICAgICBjdXJyZW50VGlsZURldGFpbHM7XHJcblxyXG4gICAgdGhpcy5tb250aFRpY2tzT2Zmc2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtLCBpKXtcclxuICAgICAgICBpZiAoIHNjcm9sbExlZnQgPj0gaXRlbS5vZmZzZXQgJiYgc2Nyb2xsTGVmdCA8PSBpdGVtLmVkZ2UgKSB7XHJcbiAgICAgICAgICAgIHJpZ2h0VGlsZUluZGV4ID0gaTtcclxuICAgICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoIHRoaXMuY3VycmVudFRpbGVJbmRleCAhPT0gcmlnaHRUaWxlSW5kZXggKSB7XHJcbiAgICAgICAgdGhpcy5tb250aFRpY2tzLmNsYXNzZWQoJ2hpZGRlbicsIGZhbHNlKS5maWx0ZXIoJzpudGgtY2hpbGQoJysgKHJpZ2h0VGlsZUluZGV4KzEpICsnKScpLmNsYXNzZWQoJ2hpZGRlbicsIHRydWUpO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlID0gdGhpcy50aWxlTW9udGhUaWNrcy5maWx0ZXIoJzpudGgtY2hpbGQoJysgKHJpZ2h0VGlsZUluZGV4KzEpICsnKScpO1xyXG5cclxuICAgICAgICB0aGlzLnRpbGVNb250aFRpY2tzLmNsYXNzZWQoJ2hpZGRlbicsIHRydWUpO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlLmNsYXNzZWQoJ2hpZGRlbicsIGZhbHNlKTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50VGlsZUluZGV4ID0gcmlnaHRUaWxlSW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgY3VycmVudFRpbGVEZXRhaWxzID0gdGhpcy5tb250aFRpY2tzT2Zmc2V0c1t0aGlzLmN1cnJlbnRUaWxlSW5kZXhdO1xyXG5cclxuICAgIGlmICggc2Nyb2xsTGVmdCA+IChjdXJyZW50VGlsZURldGFpbHMuZWRnZSAtIDIwMCkgKSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50VGlsZS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyAoY3VycmVudFRpbGVEZXRhaWxzLmVkZ2UgLSAoc2Nyb2xsTGVmdCArIDIwMCkpICsgJywgMCknKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50VGlsZS5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKDAsIDApJyk7XHJcbiAgICB9XHJcbn07XHJcblxyXG5DaGFydC5wcm90b3R5cGUuZ2V0Q2hhcnREYXRhID0gZnVuY3Rpb24gKCl7XHJcbiAgICAvLyBnZXQgYW4gYXJyYXkgb2Yga2V5LXZhbHVlIG9iamVjdHNcclxuICAgIHZhciBkYXRhSGFzaCA9IHRoaXMuZGF0YVtjb25maWcudmlkZW9dW2NvbmZpZy5hY3Rpdml0eV0sXHJcbiAgICAgICAgZGF0YSA9IGQzLm1hcChkYXRhSGFzaCkuZW50cmllcygpO1xyXG5cclxuICAgIC8vIHBhcnNlIGRhdGUgc3RyaW5nc1xyXG4gICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKXtcclxuICAgICAgICBpdGVtLmtleSA9IG5ldyBEYXRlKGl0ZW0ua2V5KTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIHNvcnQgZGF0YSBieSBkYXRlXHJcbiAgICBkYXRhID0gZGF0YS5zb3J0KGZ1bmN0aW9uIChhLCBiKXtcclxuICAgICAgICB2YXIgYVRpbWUgPSBhLmtleS5nZXRUaW1lKCksXHJcbiAgICAgICAgICAgIGJUaW1lID0gYi5rZXkuZ2V0VGltZSgpO1xyXG4gICAgICAgIHJldHVybiBhVGltZSAtIGJUaW1lO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKCBjb25maWcucGVyaW9kID09PSAnZGFpbHknICkge1xyXG4gICAgICAgIC8vIG1ha2UgZGFpbHkgdmFsdWVzXHJcbiAgICAgICAgZGF0YSA9IGRhdGEubWFwKGZ1bmN0aW9uIChpdGVtLCBpKXtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IHsga2V5OiBpdGVtLmtleSB9O1xyXG5cclxuICAgICAgICAgICAgaWYgKCBpID4gMCApe1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnZhbHVlID0gaXRlbS52YWx1ZSAtIGRhdGFbaSAtIDFdLnZhbHVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBkYXRhO1xyXG59XHJcblxyXG5DaGFydC5wcm90b3R5cGUuX2dldFRvcFZhbHVlID0gZnVuY3Rpb24gKGRhdGEpe1xyXG4gICAgdmFyIHZhbHVlID0gZDMubWF4KGRhdGEsIGZ1bmN0aW9uIChpdGVtKXtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW0udmFsdWU7XHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgZGlnaXRzTGVuZ3RoID0gdmFsdWUudG9TdHJpbmcoKS5sZW5ndGgsXHJcbiAgICAgICAgemVyb3NOdW1iZXIgPSBkaWdpdHNMZW5ndGggLSAxLFxyXG4gICAgICAgIHRlc3ROdW1iZXIgPSAnMScsXHJcbiAgICAgICAgbWF4ID0gMCxcclxuICAgICAgICByZXNpZHVlO1xyXG5cclxuICAgIGlmICggZGlnaXRzTGVuZ3RoIDw9IDEgKXtcclxuICAgICAgICBtYXggPSAxMDtcclxuICAgICAgICByZXR1cm4gbWF4O1xyXG4gICAgfVxyXG5cclxuICAgIHdoaWxlICggemVyb3NOdW1iZXIgKSB7XHJcbiAgICAgICAgdGVzdE51bWJlciArPSAnMCc7XHJcbiAgICAgICAgemVyb3NOdW1iZXItLTtcclxuICAgIH1cclxuICAgIHRlc3ROdW1iZXIgPSArdGVzdE51bWJlcjtcclxuXHJcbiAgICByZXNpZHVlID0gdmFsdWUgJSB0ZXN0TnVtYmVyO1xyXG4gICAgcm91bmRlZCA9IHZhbHVlICsgKHRlc3ROdW1iZXIgLSByZXNpZHVlKTtcclxuXHJcbiAgICBpZiAoIHZhbHVlIDwgMTAwICl7XHJcbiAgICAgICAgcm91bmRlZCA9IHJvdW5kZWQudG9TdHJpbmcoKS5zcGxpdCgnJyk7XHJcbiAgICAgICAgcm91bmRlZFswXSA9ICtyb3VuZGVkWzBdID4gNSA/ICcxMCc6ICc1JztcclxuICAgICAgICBtYXggPSArKHJvdW5kZWQuam9pbignJykpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBtYXggPSByb3VuZGVkO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1heDtcclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uIChkYXRhKXtcclxuICAgIHZhciB5ID0gZDMuc2NhbGUubGluZWFyKCkuZG9tYWluKFswLCB0aGlzLl9nZXRUb3BWYWx1ZShkYXRhKV0pLnJhbmdlKFtoZWlnaHQsIDBdKSxcclxuICAgICAgICBzY2FsZURhdGEgPSB5LnRpY2tzKDQpLm1hcCh5LnRpY2tGb3JtYXQoNCwgXCJkXCIpKSxcclxuICAgICAgICBjaGFydFdpZHRoID0gZGF0YS5sZW5ndGggKiBiYXJXaWR0aCxcclxuICAgICAgICBtb250aHNEYXRhID0gdGhpcy5fZ2V0TW9udGhzRGF0YShkYXRhKTtcclxuXHJcblxyXG4gICAgLy8gc2V0IHRoZSBjYW52YXMgd2lkdGhcclxuICAgIGNoYXJ0LmF0dHIoJ3dpZHRoJywgY2hhcnRXaWR0aCk7XHJcblxyXG4gICAgdGhpcy5jaGFydFdpZHRoID0gY2hhcnRXaWR0aDtcclxuXHJcbiAgICAvLyBjbGVhciBjYW52YXNcclxuICAgIGNoYXJ0LnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xyXG4gICAgZDMuc2VsZWN0KCcjbW9udGhfdGlsZScpLnNlbGVjdCgnc3ZnJykuc2VsZWN0QWxsKCcqJykucmVtb3ZlKCk7XHJcblxyXG4gICAgY2hhcnQuYXBwZW5kKCdsaW5lJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd4MSc6IDAsXHJcbiAgICAgICAgICAgICd5MSc6IGhlaWdodCxcclxuICAgICAgICAgICAgJ3gyJzogY2hhcnRXaWR0aCxcclxuICAgICAgICAgICAgJ3kyJzogaGVpZ2h0LFxyXG4gICAgICAgICAgICAnY2xhc3MnOiAndGltZWxpbmUnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgLy8gZHJhdyBtb250aCB0aWNrc1xyXG4gICAgdGhpcy5fZHJhd01vbnRoVGlja3MobW9udGhzRGF0YSk7XHJcblxyXG4gICAgLy8gZHJhdyBzY2FsZVxyXG4gICAgc2NhbGUuc2VsZWN0KCdnJykucmVtb3ZlKCk7XHJcblxyXG4gICAgc2NhbGUuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cignY2xhc3MnLCAnYXhpcycpXHJcbiAgICAgICAgLmNhbGwoZDMuc3ZnLmF4aXMoKVxyXG4gICAgICAgICAgICAuc2NhbGUoeSlcclxuICAgICAgICAgICAgLm9yaWVudCgncmlnaHQnKVxyXG4gICAgICAgICAgICAudGlja3MoNClcclxuICAgICAgICAgICAgLnRpY2tGb3JtYXQoIGQzLmZvcm1hdCgncycpICkgKTtcclxuXHJcbiAgICAvLyBkcmF3IGJhcnNcclxuICAgIGlmICggY29uZmlnLnBlcmlvZCA9PT0gJ2RhaWx5JyApe1xyXG4gICAgICAgIHRoaXMuX2RyYXdEYWlseUJhcnMoZGF0YSwgeSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuX2RyYXdHcm9zc0JhcnMoZGF0YSwgeSk7XHJcbiAgICB9XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZHJhd0RhaWx5QmFycyA9IGZ1bmN0aW9uIChkYXRhLCB5KSB7XHJcbiAgICB2YXIgYmFyID0gY2hhcnQuc2VsZWN0QWxsKCdnLmJhcicpXHJcbiAgICAgICAgLmRhdGEoZGF0YSlcclxuICAgICAgICAuZW50ZXIoKVxyXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuICd0cmFuc2xhdGUoJyArIGkgKiBiYXJXaWR0aCArICcsIDApJzsgfSxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2JhcidcclxuICAgICAgICB9KTtcclxuXHJcbiAgICBiYXIuYXBwZW5kKCdyZWN0JylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdzaGFwZS1yZW5kZXJpbmcnOiAnY3Jpc3BFZGdlcycsXHJcbiAgICAgICAgICAgICdmaWxsJzogJ3JnYmEoNTcsIDE4NiwgMTMwLCAwLjMpJyxcclxuICAgICAgICAgICAgJ3dpZHRoJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICdoZWlnaHQnOiAwLFxyXG4gICAgICAgICAgICAnY2xhc3MnOiAnYmFyX9GBb2x1bW4nLFxyXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgwLCcrIGhlaWdodCArJyknXHJcbiAgICAgICAgfSlcclxuICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgLmR1cmF0aW9uKDUwMClcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdoZWlnaHQnOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaGVpZ2h0IC0geShkLnZhbHVlKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uIChkLCBpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgwLCcrIHkoZC52YWx1ZSkgKyAnKSc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICBiYXIuYXBwZW5kKCdyZWN0JylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdzaGFwZS1yZW5kZXJpbmcnOiAnY3Jpc3BFZGdlcycsXHJcbiAgICAgICAgICAgICdmaWxsJzogJ3JnYmEoNTcsIDE4NiwgMTMwLCAxKScsXHJcbiAgICAgICAgICAgICd3aWR0aCc6IGJhcldpZHRoLFxyXG4gICAgICAgICAgICAnaGVpZ2h0JzogMixcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2Jhcl9jb2x1bW5faGVhZCcsXHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiAndHJhbnNsYXRlKDAsJysgaGVpZ2h0ICsgJyknXHJcbiAgICAgICAgfSlcclxuICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgLmR1cmF0aW9uKDUwMClcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbiAoZCwgaSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoMCwnKyB5KGQudmFsdWUpICsgJyknO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAndmFsdWUnLFxyXG4gICAgICAgICAgICAneCc6IGJhcldpZHRoIC8gMixcclxuICAgICAgICAgICAgJ3knOiBoZWlnaHQsXHJcbiAgICAgICAgICAgICdmaWxsLW9wYWNpdHknOiAwXHJcbiAgICAgICAgfSlcclxuICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KVxyXG4gICAgICAgIC50cmFuc2l0aW9uKClcclxuICAgICAgICAuZHVyYXRpb24oNTAwKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3knOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geShkLnZhbHVlKSAtIDU7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICdmaWxsLW9wYWNpdHknOiAxXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdGhpcy5iYXIgPSBiYXI7XHJcblxyXG4gICAgdGhpcy5fZHJhd1RpbWVsaW5lKGJhcik7XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZHJhd0dyb3NzQmFycyA9IGZ1bmN0aW9uIChkYXRhLCB5KXtcclxuICAgIHZhciBhcmVhID0gZDMuc3ZnLmFyZWEoKVxyXG4gICAgICAgIC5pbnRlcnBvbGF0ZSgnbW9ub3RvbmUnKVxyXG4gICAgICAgIC54KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGkgKiBiYXJXaWR0aCArIChiYXJXaWR0aCAvIDIpOyB9KVxyXG4gICAgICAgIC55MChoZWlnaHQpXHJcbiAgICAgICAgLnkxKGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIHkoZC52YWx1ZSk7IH0pO1xyXG5cclxuICAgIGNoYXJ0LmFwcGVuZCgncGF0aCcpXHJcbiAgICAgICAgLmRhdHVtKGRhdGEpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAnYXJlYScsXHJcbiAgICAgICAgICAgICdkJzogYXJlYVxyXG4gICAgICAgIH0pO1xyXG5cclxuXHJcbiAgICB2YXIgbGluZSA9IGQzLnN2Zy5saW5lKClcclxuICAgICAgICAueChmdW5jdGlvbihkLCBpKSB7IHJldHVybiBpICogYmFyV2lkdGggKyAoYmFyV2lkdGggLyAyKTsgfSlcclxuICAgICAgICAueShmdW5jdGlvbihkLCBpKSB7IHJldHVybiB5KGQudmFsdWUpOyB9KVxyXG4gICAgICAgIC5pbnRlcnBvbGF0ZSgnbGluZWFyJyk7XHJcblxyXG4gICAgY2hhcnQuYXBwZW5kKCdwYXRoJylcclxuICAgICAgICAuZGF0dW0oZGF0YSlcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdjdXJ2ZScsXHJcbiAgICAgICAgICAgICdkJzogbGluZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIHZhciBiYXIgPSBjaGFydC5zZWxlY3RBbGwoJ2cuYmFyJylcclxuICAgICAgICAuZGF0YShkYXRhKVxyXG4gICAgICAgIC5lbnRlcigpXHJcbiAgICAgICAgLmFwcGVuZCgnZycpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgaSAqIGJhcldpZHRoICsgJywgMCknOyB9LFxyXG4gICAgICAgICAgICAnY2xhc3MnOiAnYmFyJ1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAnY2lyY2xlX3N0cm9rZScsXHJcbiAgICAgICAgICAgICdyJzogNixcclxuICAgICAgICAgICAgJ2N4JzogYmFyV2lkdGggLyAyLFxyXG4gICAgICAgICAgICAnY3knOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gTWF0aC5yb3VuZCh5KGQudmFsdWUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5hcHBlbmQoJ2NpcmNsZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnY2xhc3MnOiAnY2lyY2xlJyxcclxuICAgICAgICAgICAgJ3InOiA0LFxyXG4gICAgICAgICAgICAnY3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICdjeSc6IGZ1bmN0aW9uIChkKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHkoZC52YWx1ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdGhpcy5fZHJhd1RpbWVsaW5lKGJhcik7XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZHJhd1RpbWVsaW5lID0gZnVuY3Rpb24gKGJhcil7XHJcbiAgICB2YXIgbGluZUhlaWdodCA9IDU7XHJcbiAgICAvLyBkYXlzXHJcbiAgICBiYXIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd4JzogYmFyV2lkdGggLyAyLFxyXG4gICAgICAgICAgICAneSc6IGhlaWdodCArIDE1LFxyXG4gICAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICB2YXIgZGF5ID0gZC5rZXkuZ2V0RGF5KCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRheSA9PT0gMCB8fCBkYXkgPT09IDYpICYmIGNvbmZpZy5zaG93V2Vla2RheXMgPyAnZGF0ZSBob2xpZGF5JzogJ2RhdGUnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICAudGV4dCggZnVuY3Rpb24oZCl7XHJcbiAgICAgICAgICAgIHJldHVybiBkLmtleS5nZXREYXRlKCk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgLy8gd2Vla2RheXNcclxuICAgIGlmICggY29uZmlnLnNob3dXZWVrZGF5cyApIHtcclxuICAgICAgICBiYXIuYXBwZW5kKCd0ZXh0JylcclxuICAgICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICAgICAneSc6IGhlaWdodCArIDMwLFxyXG4gICAgICAgICAgICAgICAgJ2NsYXNzJzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF5ID09PSAwIHx8IGRheSA9PT0gNiA/ICd3ZWVrZGF5IGhvbGlkYXknOiAnd2Vla2RheSc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50ZXh0KCBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB3ZWVrZGF5c1tkYXldO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbGluZUhlaWdodCA9IDMwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRpdmlkZXJcclxuICAgIGJhci5hcHBlbmQoJ2xpbmUnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3gxJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICd5MSc6IGhlaWdodCxcclxuICAgICAgICAgICAgJ3gyJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICd5Mic6IGhlaWdodCArIGxpbmVIZWlnaHQsXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICd0aW1lbGluZSdcclxuICAgICAgICB9KTtcclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLnJlc2V0VmFsdWVzID0gZnVuY3Rpb24gKGNhbGxiYWNrKXtcclxuICAgIHZhciBkdXJhdGlvbiA9IDI1MCxcclxuICAgICAgICB0aW1lciA9IG51bGw7XHJcblxyXG4gICAgaWYgKCBjb25maWcucGVyaW9kID09PSAnZGFpbHknICkge1xyXG4gICAgICAgIHRoaXMuYmFyLnNlbGVjdEFsbCgnLmJhcl9jb2x1bW5faGVhZCcpXHJcbiAgICAgICAgICAgIC50cmFuc2l0aW9uKClcclxuICAgICAgICAgICAgLmR1cmF0aW9uKGR1cmF0aW9uKVxyXG4gICAgICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICAgICAndHJhbnNmb3JtJzogJ3RyYW5zbGF0ZSgwLCcrIGhlaWdodCArICcpJ1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5iYXIuc2VsZWN0QWxsKCcuYmFyX9GBb2x1bW4nKVxyXG4gICAgICAgICAgICAudHJhbnNpdGlvbigpXHJcbiAgICAgICAgICAgIC5kdXJhdGlvbihkdXJhdGlvbilcclxuICAgICAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAgICAgJ3RyYW5zZm9ybSc6ICd0cmFuc2xhdGUoMCwnKyBoZWlnaHQgKyAnKScsXHJcbiAgICAgICAgICAgICAgICAnaGVpZ2h0JzogMFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5iYXIuc2VsZWN0QWxsKCcudmFsdWUnKVxyXG4gICAgICAgICAgICAudHJhbnNpdGlvbihmdW5jdGlvbiAoKXtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKDEpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAuZHVyYXRpb24oZHVyYXRpb24pXHJcbiAgICAgICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgICAgICd5JzogaGVpZ2h0LFxyXG4gICAgICAgICAgICAgICAgJ2ZpbGwtb3BhY2l0eSc6IDBcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLmVhY2goJ2VuZCcsIGZ1bmN0aW9uICgpe1xyXG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcclxuICAgICAgICAgICAgICAgIHRpbWVyID0gc2V0VGltZW91dChjYWxsYmFjaywgMTAwKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNhbGxiYWNrKCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5jaGFuZ2VWaWRlbyA9IGZ1bmN0aW9uICh2YWx1ZSl7XHJcblxyXG4gICAgdGhpcy5yZXNldFZhbHVlcyhmdW5jdGlvbiAoKXtcclxuICAgICAgICBjb25maWcudmlkZW8gPSB2YWx1ZTtcclxuICAgICAgICB2YXIgY2hhcnREYXRhID0gdGhpcy5nZXRDaGFydERhdGEoKVxyXG4gICAgICAgIHRoaXMucmVuZGVyKGNoYXJ0RGF0YSk7XHJcbiAgICB9LmJpbmQodGhpcykpO1xyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLmNoYW5nZUFjdGl2aXR5ID0gZnVuY3Rpb24gKHZhbHVlKXtcclxuXHJcbiAgICB0aGlzLnJlc2V0VmFsdWVzKGZ1bmN0aW9uICgpe1xyXG4gICAgICAgIGNvbmZpZy5hY3Rpdml0eSA9IHZhbHVlO1xyXG4gICAgICAgIHZhciBjaGFydERhdGEgPSB0aGlzLmdldENoYXJ0RGF0YSgpXHJcbiAgICAgICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcclxuICAgIH0uYmluZCh0aGlzKSk7XHJcbn07XHJcblxyXG5DaGFydC5wcm90b3R5cGUuY2hhbmdlUGVyaW9kID0gZnVuY3Rpb24gKHZhbHVlKXtcclxuICAgIGNvbmZpZy5wZXJpb2QgPSB2YWx1ZTtcclxuICAgIHZhciBjaGFydERhdGEgPSB0aGlzLmdldENoYXJ0RGF0YSgpO1xyXG5cclxuICAgIHRoaXMucmVuZGVyKGNoYXJ0RGF0YSk7XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IENoYXJ0O1xyXG4iLCJ2YXIgQ2hhcnQgPSByZXF1aXJlKCcuL2NoYXJ0JyksXHJcbiAgICBjaGFydCA9IG5ldyBDaGFydCgpLFxyXG4gICAgdmlkZW9TZWxlY3QgPSBkMy5zZWxlY3QoJyN2aWRlb19zZWxlY3QnKSxcclxuICAgIHN3aXRjaGVycyA9IGQzLnNlbGVjdEFsbCgnLnN3aXRjaGVyJyk7XHJcblxyXG5mdW5jdGlvbiBDb250cm9sbGVyICgpe1xyXG4gICAgLy8gbWFrZSB0aGlzIGNsYXNzIGEgc2luZ2xldG9uXHJcbiAgICBpZiAoIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlICkge1xyXG4gICAgICAgIHJldHVybiBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZTtcclxuICAgIH1cclxuICAgIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlID0gdGhpcztcclxufVxyXG5cclxuQ29udHJvbGxlci5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChkYXRhKXtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcblxyXG4gICAgdGhpcy52aWRlb1NlbGVjdCA9IHZpZGVvU2VsZWN0O1xyXG5cclxuICAgIHRoaXMuX2ZpbGxWaWRlb1NlbGVjdCgpO1xyXG4gICAgLy8gYXR0YWNoIGV2ZW50c1xyXG4gICAgc3dpdGNoZXJzLnNlbGVjdEFsbCgnc3BhbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKXtcclxuICAgICAgICB2YXIgdGFyZ2V0ID0gZDMuc2VsZWN0KHRoaXMpLFxyXG4gICAgICAgICAgICBwYXJlbnQgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKSxcclxuICAgICAgICAgICAgYWN0aW9uID0gdGhpcy5wYXJlbnROb2RlLmRhdGFzZXQuYWN0aW9uLFxyXG4gICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZGF0YXNldC52YWx1ZTtcclxuXHJcbiAgICAgICAgcGFyZW50LnNlbGVjdEFsbCgnc3BhbicpLmNsYXNzZWQoJ2FjdGl2ZScsIGZhbHNlKTtcclxuICAgICAgICB0YXJnZXQuY2xhc3NlZCgnYWN0aXZlJywgdHJ1ZSk7XHJcblxyXG4gICAgICAgIHNlbGZbYWN0aW9uXSh2YWx1ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICB2aWRlb1NlbGVjdC5vbignY2hhbmdlJywgZnVuY3Rpb24gKGUpe1xyXG4gICAgICAgIHZhciB2aWRlb0luZGV4ID0gK3RoaXMudmFsdWU7XHJcblxyXG4gICAgICAgIGNoYXJ0LmNoYW5nZVZpZGVvKHZpZGVvSW5kZXgpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5fZmlsbFZpZGVvU2VsZWN0ID0gZnVuY3Rpb24gKCl7XHJcbiAgICB2YXIgdmlkZW9OYW1lcyA9IHRoaXMuZGF0YS5tYXAoZnVuY3Rpb24gKGl0ZW0sIGkpeyByZXR1cm4gaXRlbS5uYW1lOyB9KSxcclxuICAgICAgICB2aWRlb1VwZGF0ZSA9IHZpZGVvU2VsZWN0LnNlbGVjdEFsbCgnb3B0aW9ucycpLmRhdGEodmlkZW9OYW1lcyk7XHJcblxyXG4gICAgdmlkZW9VcGRhdGVcclxuICAgIC5lbnRlcigpXHJcbiAgICAuYXBwZW5kKCdvcHRpb24nKVxyXG4gICAgLnRleHQoZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgIHJldHVybiBkO1xyXG4gICAgfSlcclxuICAgIC5hdHRyKCd2YWx1ZScsIGZ1bmN0aW9uIChkKXtcclxuICAgICAgICByZXR1cm4gdmlkZW9OYW1lcy5pbmRleE9mKGQpO1xyXG4gICAgfSk7XHJcbn07XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zd2l0Y2hBY3Rpdml0eSA9IGZ1bmN0aW9uICh2YWx1ZSl7XHJcbiAgICBjaGFydC5jaGFuZ2VBY3Rpdml0eSh2YWx1ZSk7XHJcbn07XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5zd2l0Y2hQZXJpb2QgPSBmdW5jdGlvbiAodmFsdWUpe1xyXG4gICAgY2hhcnQuY2hhbmdlUGVyaW9kKHZhbHVlKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbGxlcjsiXX0=
