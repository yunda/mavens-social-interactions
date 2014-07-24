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

    var sl = 0;
    scrollWrapper.on('scroll', function (){
        var scrollLeft = this.scrollLeft;

        self.monthTicksOffsets.forEach(function (offset, i){
            var relativeOffset = offset - scrollLeft;

            if ( relativeOffset > 0 && relativeOffset < 200 ) {
                d3.select(self.tileMonthTicks[0][0]).attr('transform', 'translate(' + (relativeOffset - 200) + ', 0)');

                console.log('move tile');
            } else if ( relativeOffset === 0) {
                console.log('change tile');
            }
        });
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
    var monthTicks = chart.append('g')
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

    this.tileMonthTicks = monthTile.select('g.month_ticks').selectAll('.month_tick');

    this.monthTicks = monthTicks;

    this.monthTicksOffsets = monthsData.map(function (item, i){
        return item.offset;
    });
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

Chart.prototype._getTopValue = function (value){
    var digitsLength = value.toString().length,
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

    var max = d3.max(data, function (item){
            return item.value;
        }),
        y = d3.scale.linear().domain([0, this._getTopValue(max)]).range([height, 0]),
        scaleData = y.ticks(4).map(y.tickFormat(4, "d")),
        chartWidth = data.length * barWidth,
        monthsData = this._getMonthsData(data);


    // set the canvas width
    chart.attr('width', chartWidth);

    // clear canvas
    chart.selectAll('*').remove();

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
            'transform': function (d, i) {
                return 'translate(0,'+ y(d.value) + ')';
            }
        });

    bar.append('text')
        .attr({
            'class': 'value',
            'x': barWidth / 2,
            'y': function (d){
                return y(d.value) - 5;
            }
        })
        .text(function(d) { return d.value; });

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

Chart.prototype.changeVideo = function (value){
    config.video = value;
    var chartData = this.getChartData();

    this.render(chartData);
};

Chart.prototype.changeActivity = function (value){
    config.activity = value;
    var chartData = this.getChartData();

    this.render(chartData);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6XFxVc2Vyc1xcaXZhbi55dW5kYVxcQXBwRGF0YVxcUm9hbWluZ1xcbnBtXFxub2RlX21vZHVsZXNcXHdhdGNoaWZ5XFxub2RlX21vZHVsZXNcXGJyb3dzZXJpZnlcXG5vZGVfbW9kdWxlc1xcYnJvd3Nlci1wYWNrXFxfcHJlbHVkZS5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL2FwcC5qcyIsIkQ6L21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL2pzL2NoYXJ0LmpzIiwiRDovbWF2ZW5zLXNvY2lhbC1pbnRlcmFjdGlvbnMvanMvY29udHJvbGxlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3phQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgQ2hhcnQgPSByZXF1aXJlKCcuL2NoYXJ0JyksXHJcbiAgICBDb250b2xsZXIgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXInKTtcclxuXHJcbi8vIHJldHJpZXZlIGRhdGFcclxuZDMuanNvbignLi9kYXRhLmpzb24nLCBpbml0KTtcclxuXHJcbmZ1bmN0aW9uIGluaXQgKGVyciwgZGF0YSl7XHJcbiAgICB2YXIgY29udG9sbGVyID0gbmV3IENvbnRvbGxlcigpLFxyXG4gICAgICAgIGNoYXJ0ID0gbmV3IENoYXJ0KCk7XHJcblxyXG4gICAgY29udG9sbGVyLmluaXQoZGF0YSk7XHJcbiAgICBjaGFydC5pbml0KGRhdGEpO1xyXG5cclxufSIsInZhciBoZWlnaHQgPSAzMDAsXHJcbiAgICBiYXJXaWR0aCA9IDQwLFxyXG4gICAgc2Nyb2xsV3JhcHBlciA9IGQzLnNlbGVjdCgnLnNjcm9sbF93cmFwcGVyJyksXHJcbiAgICBjaGFydCA9IGQzLnNlbGVjdCgnI2NoYXJ0JykuYXBwZW5kKCdzdmcnKS5hdHRyKCdoZWlnaHQnLCBoZWlnaHQgKyA0MCksXHJcbiAgICBzY2FsZSA9IGQzLnNlbGVjdCgnI3NjYWxlJykuYXBwZW5kKCdzdmcnKS5hdHRyKHsgJ2hlaWdodCc6IGhlaWdodCArIDIwLCAnd2lkdGgnOjYwIH0pLFxyXG4gICAgbW9udGhUaWxlID0gZDMuc2VsZWN0KCcjbW9udGhfdGlsZScpLmFwcGVuZCgnc3ZnJykuYXR0cih7ICdoZWlnaHQnOiBoZWlnaHQsICd3aWR0aCc6IDIwMCB9KSxcclxuICAgIG1vbnRocyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddLFxyXG4gICAgd2Vla2RheXMgPSBbJ1NVTicsICdNT04nLCAnVFVFJywgJ1dFRCcsICdUSFUnLCAnRlJJJywgJ1NBVCddLFxyXG5cclxuICAgIC8vIGRlZmF1bHQgY29uZmlnXHJcbiAgICBjb25maWcgPSB7XHJcbiAgICAgICAgdmlkZW86IDAsXHJcbiAgICAgICAgYWN0aXZpdHk6ICd2aWV3cycsXHJcbiAgICAgICAgcGVyaW9kOiAnZGFpbHknLFxyXG4gICAgICAgIHNob3dXZWVrZGF5czogdHJ1ZVxyXG4gICAgfTtcclxuXHJcblxyXG4vLyBjb25zdHJ1Y3RvclxyXG5mdW5jdGlvbiBDaGFydCAoKXtcclxuICAgIC8vIG1ha2UgdGhpcyBjbGFzcyBhIHNpbmdsZXRvblxyXG4gICAgaWYgKCBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZSApIHtcclxuICAgICAgICByZXR1cm4gYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2U7XHJcbiAgICB9XHJcbiAgICBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZSA9IHRoaXM7XHJcblxyXG59XHJcblxyXG5DaGFydC5wcm90b3R5cGUuaW5pdCA9IGZ1bmN0aW9uIChkYXRhKXtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuXHJcbiAgICB2YXIgY2hhcnREYXRhID0gdGhpcy5nZXRDaGFydERhdGEoKTtcclxuICAgIHRoaXMubW9udGhUaWNrc09mZnNldHMgPSBbXTtcclxuXHJcbiAgICB0aGlzLnJlbmRlcihjaGFydERhdGEpO1xyXG5cclxuICAgIHZhciBzbCA9IDA7XHJcbiAgICBzY3JvbGxXcmFwcGVyLm9uKCdzY3JvbGwnLCBmdW5jdGlvbiAoKXtcclxuICAgICAgICB2YXIgc2Nyb2xsTGVmdCA9IHRoaXMuc2Nyb2xsTGVmdDtcclxuXHJcbiAgICAgICAgc2VsZi5tb250aFRpY2tzT2Zmc2V0cy5mb3JFYWNoKGZ1bmN0aW9uIChvZmZzZXQsIGkpe1xyXG4gICAgICAgICAgICB2YXIgcmVsYXRpdmVPZmZzZXQgPSBvZmZzZXQgLSBzY3JvbGxMZWZ0O1xyXG5cclxuICAgICAgICAgICAgaWYgKCByZWxhdGl2ZU9mZnNldCA+IDAgJiYgcmVsYXRpdmVPZmZzZXQgPCAyMDAgKSB7XHJcbiAgICAgICAgICAgICAgICBkMy5zZWxlY3Qoc2VsZi50aWxlTW9udGhUaWNrc1swXVswXSkuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgKHJlbGF0aXZlT2Zmc2V0IC0gMjAwKSArICcsIDApJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ21vdmUgdGlsZScpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCByZWxhdGl2ZU9mZnNldCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ2NoYW5nZSB0aWxlJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9nZXRNb250aHNEYXRhID0gZnVuY3Rpb24gKGNoYXJ0RGF0YSl7XHJcbiAgICB2YXIgbW9udGhzRGF0YSA9IFtdO1xyXG5cclxuICAgIC8vIGZpbGwgbW9udGhzIGRhdGFcclxuICAgIGNoYXJ0RGF0YS5mb3JFYWNoKChmdW5jdGlvbiAoKXtcclxuICAgICAgICB2YXIgY3VycmVudE1vbnRoID0gJyc7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChpdGVtLCBpKXtcclxuICAgICAgICAgICAgLy8gdXNlIGQzLnRpbWUuZm9ybWF0KFwiJWIgJVlcIikucGFyc2U7XHJcbiAgICAgICAgICAgIHZhciBtb250aCA9IG1vbnRoc1tpdGVtLmtleS5nZXRNb250aCgpXSxcclxuICAgICAgICAgICAgICAgIHllYXIgPSAgaXRlbS5rZXkuZ2V0RnVsbFllYXIoKSxcclxuICAgICAgICAgICAgICAgIG1vbnRoU3RyaW5nID0gbW9udGhzW2l0ZW0ua2V5LmdldE1vbnRoKCldICsgJyAnICsgaXRlbS5rZXkuZ2V0RnVsbFllYXIoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICggbW9udGhTdHJpbmcgIT09IGN1cnJlbnRNb250aCApIHtcclxuICAgICAgICAgICAgICAgIG1vbnRoc0RhdGEucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9udGhTdHJpbmc6IG1vbnRoU3RyaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoOiBtb250aCxcclxuICAgICAgICAgICAgICAgICAgICB5ZWFyOiB5ZWFyLFxyXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogaSAqIGJhcldpZHRoXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBjdXJyZW50TW9udGggPSBtb250aFN0cmluZztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pKCkpO1xyXG5cclxuICAgIHJldHVybiBtb250aHNEYXRhO1xyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9kcmF3TW9udGhUaWNrcyA9IGZ1bmN0aW9uIChtb250aHNEYXRhKXtcclxuICAgIHZhciBtb250aFRpY2tzID0gY2hhcnQuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7ICdjbGFzcyc6ICdtb250aF90aWNrcycgfSk7XHJcblxyXG4gICAgdmFyIG1vbnRoVGljayA9IG1vbnRoVGlja3Muc2VsZWN0QWxsKCdnLm1vbnRoX3RpY2snKVxyXG4gICAgICAgIC5kYXRhKG1vbnRoc0RhdGEpXHJcbiAgICAgICAgLmVudGVyKClcclxuICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBkLm9mZnNldCArICcsIDApJzsgfSxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ21vbnRoX3RpY2snXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgbW9udGhUaWNrLmFwcGVuZCgnbGluZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAneDEnOiAwLFxyXG4gICAgICAgICAgICAneTEnOiAwLFxyXG4gICAgICAgICAgICAneDInOiAwLFxyXG4gICAgICAgICAgICAneTInOiBoZWlnaHRcclxuICAgICAgICB9KTtcclxuXHJcbiAgICB2YXIgbW9udGhUZXh0ID0gbW9udGhUaWNrLmFwcGVuZCgndGV4dCcpXHJcbiAgICAgICAgLmF0dHIoeyAneCc6IDEwLCAneSc6IDAgfSk7XHJcblxyXG4gICAgbW9udGhUZXh0LmFwcGVuZCgndHNwYW4nKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2R5JzogJzQwcHgnLFxyXG4gICAgICAgICAgICAneCc6ICcxMCcsXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdtb250aF90aWNrX21vbnRoJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpeyByZXR1cm4gZC5tb250aCB9KTtcclxuXHJcbiAgICBtb250aFRleHQuYXBwZW5kKCd0c3BhbicpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAnZHknOiAnNDBweCcsXHJcbiAgICAgICAgICAgICd4JzogJzEwJyxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ21vbnRoX3RpY2tfeWVhcidcclxuICAgICAgICB9KVxyXG4gICAgICAgIC50ZXh0KGZ1bmN0aW9uIChkKXsgcmV0dXJuIGQueWVhciB9KTtcclxuXHJcbiAgICAvLyBjb3B5IG1vbnRoIHRpY2tzIHRvIHRoZSBtb250aCB0aWxlXHJcbiAgICBtb250aFRpbGUubm9kZSgpLmFwcGVuZENoaWxkKGNoYXJ0LnNlbGVjdCgnZy5tb250aF90aWNrcycpLm5vZGUoKS5jbG9uZU5vZGUodHJ1ZSkpO1xyXG5cclxuICAgIHRoaXMudGlsZU1vbnRoVGlja3MgPSBtb250aFRpbGUuc2VsZWN0KCdnLm1vbnRoX3RpY2tzJykuc2VsZWN0QWxsKCcubW9udGhfdGljaycpO1xyXG5cclxuICAgIHRoaXMubW9udGhUaWNrcyA9IG1vbnRoVGlja3M7XHJcblxyXG4gICAgdGhpcy5tb250aFRpY2tzT2Zmc2V0cyA9IG1vbnRoc0RhdGEubWFwKGZ1bmN0aW9uIChpdGVtLCBpKXtcclxuICAgICAgICByZXR1cm4gaXRlbS5vZmZzZXQ7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5nZXRDaGFydERhdGEgPSBmdW5jdGlvbiAoKXtcclxuICAgIC8vIGdldCBhbiBhcnJheSBvZiBrZXktdmFsdWUgb2JqZWN0c1xyXG4gICAgdmFyIGRhdGFIYXNoID0gdGhpcy5kYXRhW2NvbmZpZy52aWRlb11bY29uZmlnLmFjdGl2aXR5XSxcclxuICAgICAgICBkYXRhID0gZDMubWFwKGRhdGFIYXNoKS5lbnRyaWVzKCk7XHJcblxyXG4gICAgLy8gcGFyc2UgZGF0ZSBzdHJpbmdzXHJcbiAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pe1xyXG4gICAgICAgIGl0ZW0ua2V5ID0gbmV3IERhdGUoaXRlbS5rZXkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gc29ydCBkYXRhIGJ5IGRhdGVcclxuICAgIGRhdGEgPSBkYXRhLnNvcnQoZnVuY3Rpb24gKGEsIGIpe1xyXG4gICAgICAgIHZhciBhVGltZSA9IGEua2V5LmdldFRpbWUoKSxcclxuICAgICAgICAgICAgYlRpbWUgPSBiLmtleS5nZXRUaW1lKCk7XHJcbiAgICAgICAgcmV0dXJuIGFUaW1lIC0gYlRpbWU7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoIGNvbmZpZy5wZXJpb2QgPT09ICdkYWlseScgKSB7XHJcbiAgICAgICAgLy8gbWFrZSBkYWlseSB2YWx1ZXNcclxuICAgICAgICBkYXRhID0gZGF0YS5tYXAoZnVuY3Rpb24gKGl0ZW0sIGkpe1xyXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0geyBrZXk6IGl0ZW0ua2V5IH07XHJcblxyXG4gICAgICAgICAgICBpZiAoIGkgPiAwICl7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQudmFsdWUgPSBpdGVtLnZhbHVlIC0gZGF0YVtpIC0gMV0udmFsdWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQudmFsdWUgPSBpdGVtLnZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGRhdGE7XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5fZ2V0VG9wVmFsdWUgPSBmdW5jdGlvbiAodmFsdWUpe1xyXG4gICAgdmFyIGRpZ2l0c0xlbmd0aCA9IHZhbHVlLnRvU3RyaW5nKCkubGVuZ3RoLFxyXG4gICAgICAgIHplcm9zTnVtYmVyID0gZGlnaXRzTGVuZ3RoIC0gMSxcclxuICAgICAgICB0ZXN0TnVtYmVyID0gJzEnLFxyXG4gICAgICAgIG1heCA9IDAsXHJcbiAgICAgICAgcmVzaWR1ZTtcclxuXHJcbiAgICBpZiAoIGRpZ2l0c0xlbmd0aCA8PSAxICl7XHJcbiAgICAgICAgbWF4ID0gMTA7XHJcbiAgICAgICAgcmV0dXJuIG1heDtcclxuICAgIH1cclxuXHJcbiAgICB3aGlsZSAoIHplcm9zTnVtYmVyICkge1xyXG4gICAgICAgIHRlc3ROdW1iZXIgKz0gJzAnO1xyXG4gICAgICAgIHplcm9zTnVtYmVyLS07XHJcbiAgICB9XHJcbiAgICB0ZXN0TnVtYmVyID0gK3Rlc3ROdW1iZXI7XHJcblxyXG4gICAgcmVzaWR1ZSA9IHZhbHVlICUgdGVzdE51bWJlcjtcclxuICAgIHJvdW5kZWQgPSB2YWx1ZSArICh0ZXN0TnVtYmVyIC0gcmVzaWR1ZSk7XHJcblxyXG4gICAgaWYgKCB2YWx1ZSA8IDEwMCApe1xyXG4gICAgICAgIHJvdW5kZWQgPSByb3VuZGVkLnRvU3RyaW5nKCkuc3BsaXQoJycpO1xyXG4gICAgICAgIHJvdW5kZWRbMF0gPSArcm91bmRlZFswXSA+IDUgPyAnMTAnOiAnNSc7XHJcbiAgICAgICAgbWF4ID0gKyhyb3VuZGVkLmpvaW4oJycpKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbWF4ID0gcm91bmRlZDtcclxuICAgIH1cclxuICAgIHJldHVybiBtYXg7XHJcbn1cclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoZGF0YSl7XHJcblxyXG4gICAgdmFyIG1heCA9IGQzLm1heChkYXRhLCBmdW5jdGlvbiAoaXRlbSl7XHJcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIHkgPSBkMy5zY2FsZS5saW5lYXIoKS5kb21haW4oWzAsIHRoaXMuX2dldFRvcFZhbHVlKG1heCldKS5yYW5nZShbaGVpZ2h0LCAwXSksXHJcbiAgICAgICAgc2NhbGVEYXRhID0geS50aWNrcyg0KS5tYXAoeS50aWNrRm9ybWF0KDQsIFwiZFwiKSksXHJcbiAgICAgICAgY2hhcnRXaWR0aCA9IGRhdGEubGVuZ3RoICogYmFyV2lkdGgsXHJcbiAgICAgICAgbW9udGhzRGF0YSA9IHRoaXMuX2dldE1vbnRoc0RhdGEoZGF0YSk7XHJcblxyXG5cclxuICAgIC8vIHNldCB0aGUgY2FudmFzIHdpZHRoXHJcbiAgICBjaGFydC5hdHRyKCd3aWR0aCcsIGNoYXJ0V2lkdGgpO1xyXG5cclxuICAgIC8vIGNsZWFyIGNhbnZhc1xyXG4gICAgY2hhcnQuc2VsZWN0QWxsKCcqJykucmVtb3ZlKCk7XHJcblxyXG4gICAgY2hhcnQuYXBwZW5kKCdsaW5lJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd4MSc6IDAsXHJcbiAgICAgICAgICAgICd5MSc6IGhlaWdodCxcclxuICAgICAgICAgICAgJ3gyJzogY2hhcnRXaWR0aCxcclxuICAgICAgICAgICAgJ3kyJzogaGVpZ2h0LFxyXG4gICAgICAgICAgICAnY2xhc3MnOiAndGltZWxpbmUnXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgLy8gZHJhdyBtb250aCB0aWNrc1xyXG4gICAgdGhpcy5fZHJhd01vbnRoVGlja3MobW9udGhzRGF0YSk7XHJcblxyXG4gICAgLy8gZHJhdyBzY2FsZVxyXG4gICAgc2NhbGUuc2VsZWN0KCdnJykucmVtb3ZlKCk7XHJcblxyXG4gICAgc2NhbGUuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cignY2xhc3MnLCAnYXhpcycpXHJcbiAgICAgICAgLmNhbGwoZDMuc3ZnLmF4aXMoKVxyXG4gICAgICAgICAgICAuc2NhbGUoeSlcclxuICAgICAgICAgICAgLm9yaWVudCgncmlnaHQnKVxyXG4gICAgICAgICAgICAudGlja3MoNClcclxuICAgICAgICAgICAgLnRpY2tGb3JtYXQoIGQzLmZvcm1hdCgncycpICkgKTtcclxuXHJcbiAgICAvLyBkcmF3IGJhcnNcclxuXHJcbiAgICBpZiAoIGNvbmZpZy5wZXJpb2QgPT09ICdkYWlseScgKXtcclxuICAgICAgICB0aGlzLl9kcmF3RGFpbHlCYXJzKGRhdGEsIHkpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLl9kcmF3R3Jvc3NCYXJzKGRhdGEsIHkpO1xyXG4gICAgfVxyXG59XHJcblxyXG5DaGFydC5wcm90b3R5cGUuX2RyYXdEYWlseUJhcnMgPSBmdW5jdGlvbiAoZGF0YSwgeSkge1xyXG4gICAgdmFyIGJhciA9IGNoYXJ0LnNlbGVjdEFsbCgnZy5iYXInKVxyXG4gICAgICAgIC5kYXRhKGRhdGEpXHJcbiAgICAgICAgLmVudGVyKClcclxuICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBpICogYmFyV2lkdGggKyAnLCAwKSc7IH0sXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdiYXInXHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgIGJhci5hcHBlbmQoJ3JlY3QnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3NoYXBlLXJlbmRlcmluZyc6ICdjcmlzcEVkZ2VzJyxcclxuICAgICAgICAgICAgJ2ZpbGwnOiAncmdiYSg1NywgMTg2LCAxMzAsIDAuMyknLFxyXG4gICAgICAgICAgICAnd2lkdGgnOiBiYXJXaWR0aCxcclxuICAgICAgICAgICAgJ2hlaWdodCc6IGZ1bmN0aW9uIChkKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBoZWlnaHQgLSB5KGQudmFsdWUpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogZnVuY3Rpb24gKGQsIGkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKDAsJysgeShkLnZhbHVlKSArICcpJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5hcHBlbmQoJ3JlY3QnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3NoYXBlLXJlbmRlcmluZyc6ICdjcmlzcEVkZ2VzJyxcclxuICAgICAgICAgICAgJ2ZpbGwnOiAncmdiYSg1NywgMTg2LCAxMzAsIDEpJyxcclxuICAgICAgICAgICAgJ3dpZHRoJzogYmFyV2lkdGgsXHJcbiAgICAgICAgICAgICdoZWlnaHQnOiAyLFxyXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogZnVuY3Rpb24gKGQsIGkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKDAsJysgeShkLnZhbHVlKSArICcpJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIGJhci5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ3ZhbHVlJyxcclxuICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICd5JzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHkoZC52YWx1ZSkgLSA1O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcclxuXHJcbiAgICB0aGlzLl9kcmF3VGltZWxpbmUoYmFyKTtcclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9kcmF3R3Jvc3NCYXJzID0gZnVuY3Rpb24gKGRhdGEsIHkpe1xyXG4gICAgdmFyIGFyZWEgPSBkMy5zdmcuYXJlYSgpXHJcbiAgICAgICAgLmludGVycG9sYXRlKCdtb25vdG9uZScpXHJcbiAgICAgICAgLngoZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gaSAqIGJhcldpZHRoICsgKGJhcldpZHRoIC8gMik7IH0pXHJcbiAgICAgICAgLnkwKGhlaWdodClcclxuICAgICAgICAueTEoZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4geShkLnZhbHVlKTsgfSk7XHJcblxyXG4gICAgY2hhcnQuYXBwZW5kKCdwYXRoJylcclxuICAgICAgICAuZGF0dW0oZGF0YSlcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdhcmVhJyxcclxuICAgICAgICAgICAgJ2QnOiBhcmVhXHJcbiAgICAgICAgfSk7XHJcblxyXG5cclxuICAgIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKVxyXG4gICAgICAgIC54KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGkgKiBiYXJXaWR0aCArIChiYXJXaWR0aCAvIDIpOyB9KVxyXG4gICAgICAgIC55KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIHkoZC52YWx1ZSk7IH0pXHJcbiAgICAgICAgLmludGVycG9sYXRlKCdsaW5lYXInKTtcclxuXHJcbiAgICBjaGFydC5hcHBlbmQoJ3BhdGgnKVxyXG4gICAgICAgIC5kYXR1bShkYXRhKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ2N1cnZlJyxcclxuICAgICAgICAgICAgJ2QnOiBsaW5lXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgdmFyIGJhciA9IGNoYXJ0LnNlbGVjdEFsbCgnZy5iYXInKVxyXG4gICAgICAgIC5kYXRhKGRhdGEpXHJcbiAgICAgICAgLmVudGVyKClcclxuICAgICAgICAuYXBwZW5kKCdnJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBpICogYmFyV2lkdGggKyAnLCAwKSc7IH0sXHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdiYXInXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdjaXJjbGVfc3Ryb2tlJyxcclxuICAgICAgICAgICAgJ3InOiA2LFxyXG4gICAgICAgICAgICAnY3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICdjeSc6IGZ1bmN0aW9uIChkKXtcclxuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHkoZC52YWx1ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgYmFyLmFwcGVuZCgnY2lyY2xlJylcclxuICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICdjbGFzcyc6ICdjaXJjbGUnLFxyXG4gICAgICAgICAgICAncic6IDQsXHJcbiAgICAgICAgICAgICdjeCc6IGJhcldpZHRoIC8gMixcclxuICAgICAgICAgICAgJ2N5JzogZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQoeShkLnZhbHVlKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB0aGlzLl9kcmF3VGltZWxpbmUoYmFyKTtcclxufVxyXG5cclxuQ2hhcnQucHJvdG90eXBlLl9kcmF3VGltZWxpbmUgPSBmdW5jdGlvbiAoYmFyKXtcclxuICAgIHZhciBsaW5lSGVpZ2h0ID0gNTtcclxuICAgIC8vIGRheXNcclxuICAgIGJhci5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgIC5hdHRyKHtcclxuICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXHJcbiAgICAgICAgICAgICd5JzogaGVpZ2h0ICsgMTUsXHJcbiAgICAgICAgICAgICdjbGFzcyc6IGZ1bmN0aW9uIChkKXtcclxuICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiAoZGF5ID09PSAwIHx8IGRheSA9PT0gNikgJiYgY29uZmlnLnNob3dXZWVrZGF5cyA/ICdkYXRlIGhvbGlkYXknOiAnZGF0ZSc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICAgIC50ZXh0KCBmdW5jdGlvbihkKXtcclxuICAgICAgICAgICAgcmV0dXJuIGQua2V5LmdldERhdGUoKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAvLyB3ZWVrZGF5c1xyXG4gICAgaWYgKCBjb25maWcuc2hvd1dlZWtkYXlzICkge1xyXG4gICAgICAgIGJhci5hcHBlbmQoJ3RleHQnKVxyXG4gICAgICAgICAgICAuYXR0cih7XHJcbiAgICAgICAgICAgICAgICAneCc6IGJhcldpZHRoIC8gMixcclxuICAgICAgICAgICAgICAgICd5JzogaGVpZ2h0ICsgMzAsXHJcbiAgICAgICAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRheSA9IGQua2V5LmdldERheSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXkgPT09IDAgfHwgZGF5ID09PSA2ID8gJ3dlZWtkYXkgaG9saWRheSc6ICd3ZWVrZGF5JztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgLnRleHQoIGZ1bmN0aW9uKGQpe1xyXG4gICAgICAgICAgICAgICAgdmFyIGRheSA9IGQua2V5LmdldERheSgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHdlZWtkYXlzW2RheV07XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICBsaW5lSGVpZ2h0ID0gMzA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZGl2aWRlclxyXG4gICAgYmFyLmFwcGVuZCgnbGluZScpXHJcbiAgICAgICAgLmF0dHIoe1xyXG4gICAgICAgICAgICAneDEnOiBiYXJXaWR0aCxcclxuICAgICAgICAgICAgJ3kxJzogaGVpZ2h0LFxyXG4gICAgICAgICAgICAneDInOiBiYXJXaWR0aCxcclxuICAgICAgICAgICAgJ3kyJzogaGVpZ2h0ICsgbGluZUhlaWdodCxcclxuICAgICAgICAgICAgJ2NsYXNzJzogJ3RpbWVsaW5lJ1xyXG4gICAgICAgIH0pO1xyXG59XHJcblxyXG5DaGFydC5wcm90b3R5cGUuY2hhbmdlVmlkZW8gPSBmdW5jdGlvbiAodmFsdWUpe1xyXG4gICAgY29uZmlnLnZpZGVvID0gdmFsdWU7XHJcbiAgICB2YXIgY2hhcnREYXRhID0gdGhpcy5nZXRDaGFydERhdGEoKTtcclxuXHJcbiAgICB0aGlzLnJlbmRlcihjaGFydERhdGEpO1xyXG59O1xyXG5cclxuQ2hhcnQucHJvdG90eXBlLmNoYW5nZUFjdGl2aXR5ID0gZnVuY3Rpb24gKHZhbHVlKXtcclxuICAgIGNvbmZpZy5hY3Rpdml0eSA9IHZhbHVlO1xyXG4gICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKCk7XHJcblxyXG4gICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcclxufTtcclxuXHJcbkNoYXJ0LnByb3RvdHlwZS5jaGFuZ2VQZXJpb2QgPSBmdW5jdGlvbiAodmFsdWUpe1xyXG4gICAgY29uZmlnLnBlcmlvZCA9IHZhbHVlO1xyXG4gICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKCk7XHJcblxyXG4gICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gQ2hhcnQ7XHJcbiIsInZhciBDaGFydCA9IHJlcXVpcmUoJy4vY2hhcnQnKSxcclxuICAgIGNoYXJ0ID0gbmV3IENoYXJ0KCksXHJcbiAgICB2aWRlb1NlbGVjdCA9IGQzLnNlbGVjdCgnI3ZpZGVvX3NlbGVjdCcpLFxyXG4gICAgc3dpdGNoZXJzID0gZDMuc2VsZWN0QWxsKCcuc3dpdGNoZXInKTtcclxuXHJcbmZ1bmN0aW9uIENvbnRyb2xsZXIgKCl7XHJcbiAgICAvLyBtYWtlIHRoaXMgY2xhc3MgYSBzaW5nbGV0b25cclxuICAgIGlmICggYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgKSB7XHJcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlO1xyXG4gICAgfVxyXG4gICAgYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgPSB0aGlzO1xyXG59XHJcblxyXG5Db250cm9sbGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKGRhdGEpe1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdGhpcy5kYXRhID0gZGF0YTtcclxuXHJcbiAgICB0aGlzLnZpZGVvU2VsZWN0ID0gdmlkZW9TZWxlY3Q7XHJcblxyXG4gICAgdGhpcy5fZmlsbFZpZGVvU2VsZWN0KCk7XHJcbiAgICAvLyBhdHRhY2ggZXZlbnRzXHJcbiAgICBzd2l0Y2hlcnMuc2VsZWN0QWxsKCdzcGFuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKGUpe1xyXG4gICAgICAgIHZhciB0YXJnZXQgPSBkMy5zZWxlY3QodGhpcyksXHJcbiAgICAgICAgICAgIHBhcmVudCA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLFxyXG4gICAgICAgICAgICBhY3Rpb24gPSB0aGlzLnBhcmVudE5vZGUuZGF0YXNldC5hY3Rpb24sXHJcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5kYXRhc2V0LnZhbHVlO1xyXG5cclxuICAgICAgICBwYXJlbnQuc2VsZWN0QWxsKCdzcGFuJykuY2xhc3NlZCgnYWN0aXZlJywgZmFsc2UpO1xyXG4gICAgICAgIHRhcmdldC5jbGFzc2VkKCdhY3RpdmUnLCB0cnVlKTtcclxuXHJcbiAgICAgICAgc2VsZlthY3Rpb25dKHZhbHVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIHZpZGVvU2VsZWN0Lm9uKCdjaGFuZ2UnLCBmdW5jdGlvbiAoZSl7XHJcbiAgICAgICAgdmFyIHZpZGVvSW5kZXggPSArdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgY2hhcnQuY2hhbmdlVmlkZW8odmlkZW9JbmRleCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLl9maWxsVmlkZW9TZWxlY3QgPSBmdW5jdGlvbiAoKXtcclxuICAgIHZhciB2aWRlb05hbWVzID0gdGhpcy5kYXRhLm1hcChmdW5jdGlvbiAoaXRlbSwgaSl7IHJldHVybiBpdGVtLm5hbWU7IH0pLFxyXG4gICAgICAgIHZpZGVvVXBkYXRlID0gdmlkZW9TZWxlY3Quc2VsZWN0QWxsKCdvcHRpb25zJykuZGF0YSh2aWRlb05hbWVzKTtcclxuXHJcbiAgICB2aWRlb1VwZGF0ZVxyXG4gICAgLmVudGVyKClcclxuICAgIC5hcHBlbmQoJ29wdGlvbicpXHJcbiAgICAudGV4dChmdW5jdGlvbiAoZCl7XHJcbiAgICAgICAgcmV0dXJuIGQ7XHJcbiAgICB9KVxyXG4gICAgLmF0dHIoJ3ZhbHVlJywgZnVuY3Rpb24gKGQpe1xyXG4gICAgICAgIHJldHVybiB2aWRlb05hbWVzLmluZGV4T2YoZCk7XHJcbiAgICB9KTtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN3aXRjaEFjdGl2aXR5ID0gZnVuY3Rpb24gKHZhbHVlKXtcclxuICAgIGNoYXJ0LmNoYW5nZUFjdGl2aXR5KHZhbHVlKTtcclxufTtcclxuXHJcbkNvbnRyb2xsZXIucHJvdG90eXBlLnN3aXRjaFBlcmlvZCA9IGZ1bmN0aW9uICh2YWx1ZSl7XHJcbiAgICBjaGFydC5jaGFuZ2VQZXJpb2QodmFsdWUpO1xyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBDb250cm9sbGVyOyJdfQ==
