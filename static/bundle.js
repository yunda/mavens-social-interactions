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
    chart = d3.select('#chart').append('svg').attr('height', height + 40),
    scale = d3.select('#scale').append('svg').attr({ 'height': height + 20, 'width':60 }),
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
    this.data = data;
    this.config = config;

    var chartData = this.getChartData();

    this.render(chartData);
};

Chart.prototype._getMonthsData = function (chartData){
    var monthsData = [];

    // fill months data
    chartData.forEach((function (){
        var currentMonth = '';
        return function (item, i){
            // use d3.time.format("%b %Y").parse;
            var month = months[item.key.getMonth()] + ' ' + item.key.getFullYear();

            if ( month !== currentMonth ) {
                monthsData.push({
                    text: month,
                    margin: i * barWidth
                });

                currentMonth = month;
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
    var monthTick = chart.selectAll('g.month_tick')
        .data(monthsData)
        .enter()
        .append('g')
        .attr({
            'transform': function(d, i) { return 'translate(' + d.margin + ', 0)'; },
            'class': 'month_tick'
        });

    monthTick.append('line')
        .attr({
            'x1': 0,
            'y1': 0,
            'x2': 0,
            'y2': height
        });

    monthTick.append('text')
        .attr({
            'x': 10,
            'y': 32
        })
        .text(function (d){ return d.text });

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
    switchers = d3.selectAll('.switcher')

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy95dW5kYS9EZXNrdG9wL21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3l1bmRhL0Rlc2t0b3AvbWF2ZW5zLXNvY2lhbC1pbnRlcmFjdGlvbnMvanMvYXBwLmpzIiwiL1VzZXJzL3l1bmRhL0Rlc2t0b3AvbWF2ZW5zLXNvY2lhbC1pbnRlcmFjdGlvbnMvanMvY2hhcnQuanMiLCIvVXNlcnMveXVuZGEvRGVza3RvcC9tYXZlbnMtc29jaWFsLWludGVyYWN0aW9ucy9qcy9jb250cm9sbGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIENoYXJ0ID0gcmVxdWlyZSgnLi9jaGFydCcpLFxuICAgIENvbnRvbGxlciA9IHJlcXVpcmUoJy4vY29udHJvbGxlcicpO1xuXG4vLyByZXRyaWV2ZSBkYXRhXG5kMy5qc29uKCcuL2RhdGEuanNvbicsIGluaXQpO1xuXG5mdW5jdGlvbiBpbml0IChlcnIsIGRhdGEpe1xuICAgIHZhciBjb250b2xsZXIgPSBuZXcgQ29udG9sbGVyKCksXG4gICAgICAgIGNoYXJ0ID0gbmV3IENoYXJ0KCk7XG5cbiAgICBjb250b2xsZXIuaW5pdChkYXRhKTtcbiAgICBjaGFydC5pbml0KGRhdGEpO1xufSIsInZhciBoZWlnaHQgPSAzMDAsXG4gICAgYmFyV2lkdGggPSA0MCxcbiAgICBjaGFydCA9IGQzLnNlbGVjdCgnI2NoYXJ0JykuYXBwZW5kKCdzdmcnKS5hdHRyKCdoZWlnaHQnLCBoZWlnaHQgKyA0MCksXG4gICAgc2NhbGUgPSBkMy5zZWxlY3QoJyNzY2FsZScpLmFwcGVuZCgnc3ZnJykuYXR0cih7ICdoZWlnaHQnOiBoZWlnaHQgKyAyMCwgJ3dpZHRoJzo2MCB9KSxcbiAgICBtb250aHMgPSBbJ0phbnVhcnknLCAnRmVicnVhcnknLCAnTWFyY2gnLCAnQXByaWwnLCAnTWF5JywgJ0p1bmUnLCAnSnVseScsICdBdWd1c3QnLCAnU2VwdGVtYmVyJywgJ09jdG9iZXInLCAnTm92ZW1iZXInLCAnRGVjZW1iZXInXSxcbiAgICB3ZWVrZGF5cyA9IFsnU1VOJywgJ01PTicsICdUVUUnLCAnV0VEJywgJ1RIVScsICdGUkknLCAnU0FUJ10sXG5cbiAgICAvLyBkZWZhdWx0IGNvbmZpZ1xuICAgIGNvbmZpZyA9IHtcbiAgICAgICAgdmlkZW86IDAsXG4gICAgICAgIGFjdGl2aXR5OiAndmlld3MnLFxuICAgICAgICBwZXJpb2Q6ICdkYWlseScsXG4gICAgICAgIHNob3dXZWVrZGF5czogdHJ1ZVxuICAgIH07XG5cblxuLy8gY29uc3RydWN0b3JcbmZ1bmN0aW9uIENoYXJ0ICgpe1xuICAgIC8vIG1ha2UgdGhpcyBjbGFzcyBhIHNpbmdsZXRvblxuICAgIGlmICggYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZTtcbiAgICB9XG4gICAgYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgPSB0aGlzO1xuXG59XG5cbkNoYXJ0LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKGRhdGEpe1xuICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICB2YXIgY2hhcnREYXRhID0gdGhpcy5nZXRDaGFydERhdGEoKTtcblxuICAgIHRoaXMucmVuZGVyKGNoYXJ0RGF0YSk7XG59O1xuXG5DaGFydC5wcm90b3R5cGUuX2dldE1vbnRoc0RhdGEgPSBmdW5jdGlvbiAoY2hhcnREYXRhKXtcbiAgICB2YXIgbW9udGhzRGF0YSA9IFtdO1xuXG4gICAgLy8gZmlsbCBtb250aHMgZGF0YVxuICAgIGNoYXJ0RGF0YS5mb3JFYWNoKChmdW5jdGlvbiAoKXtcbiAgICAgICAgdmFyIGN1cnJlbnRNb250aCA9ICcnO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGl0ZW0sIGkpe1xuICAgICAgICAgICAgLy8gdXNlIGQzLnRpbWUuZm9ybWF0KFwiJWIgJVlcIikucGFyc2U7XG4gICAgICAgICAgICB2YXIgbW9udGggPSBtb250aHNbaXRlbS5rZXkuZ2V0TW9udGgoKV0gKyAnICcgKyBpdGVtLmtleS5nZXRGdWxsWWVhcigpO1xuXG4gICAgICAgICAgICBpZiAoIG1vbnRoICE9PSBjdXJyZW50TW9udGggKSB7XG4gICAgICAgICAgICAgICAgbW9udGhzRGF0YS5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogbW9udGgsXG4gICAgICAgICAgICAgICAgICAgIG1hcmdpbjogaSAqIGJhcldpZHRoXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBjdXJyZW50TW9udGggPSBtb250aDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pKCkpO1xuXG4gICAgcmV0dXJuIG1vbnRoc0RhdGE7XG59O1xuXG5DaGFydC5wcm90b3R5cGUuZ2V0Q2hhcnREYXRhID0gZnVuY3Rpb24gKCl7XG4gICAgLy8gZ2V0IGFuIGFycmF5IG9mIGtleS12YWx1ZSBvYmplY3RzXG4gICAgdmFyIGRhdGFIYXNoID0gdGhpcy5kYXRhW2NvbmZpZy52aWRlb11bY29uZmlnLmFjdGl2aXR5XSxcbiAgICAgICAgZGF0YSA9IGQzLm1hcChkYXRhSGFzaCkuZW50cmllcygpO1xuXG4gICAgLy8gcGFyc2UgZGF0ZSBzdHJpbmdzXG4gICAgZGF0YS5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKXtcbiAgICAgICAgaXRlbS5rZXkgPSBuZXcgRGF0ZShpdGVtLmtleSk7XG4gICAgfSk7XG5cbiAgICAvLyBzb3J0IGRhdGEgYnkgZGF0ZVxuICAgIGRhdGEgPSBkYXRhLnNvcnQoZnVuY3Rpb24gKGEsIGIpe1xuICAgICAgICB2YXIgYVRpbWUgPSBhLmtleS5nZXRUaW1lKCksXG4gICAgICAgICAgICBiVGltZSA9IGIua2V5LmdldFRpbWUoKTtcbiAgICAgICAgcmV0dXJuIGFUaW1lIC0gYlRpbWU7XG4gICAgfSk7XG5cbiAgICBpZiAoIGNvbmZpZy5wZXJpb2QgPT09ICdkYWlseScgKSB7XG4gICAgICAgIC8vIG1ha2UgZGFpbHkgdmFsdWVzXG4gICAgICAgIGRhdGEgPSBkYXRhLm1hcChmdW5jdGlvbiAoaXRlbSwgaSl7XG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0geyBrZXk6IGl0ZW0ua2V5IH07XG5cbiAgICAgICAgICAgIGlmICggaSA+IDAgKXtcbiAgICAgICAgICAgICAgICByZXN1bHQudmFsdWUgPSBpdGVtLnZhbHVlIC0gZGF0YVtpIC0gMV0udmFsdWU7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IGl0ZW0udmFsdWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YTtcbn1cblxuQ2hhcnQucHJvdG90eXBlLl9nZXRUb3BWYWx1ZSA9IGZ1bmN0aW9uICh2YWx1ZSl7XG4gICAgdmFyIGRpZ2l0c0xlbmd0aCA9IHZhbHVlLnRvU3RyaW5nKCkubGVuZ3RoLFxuICAgICAgICB6ZXJvc051bWJlciA9IGRpZ2l0c0xlbmd0aCAtIDEsXG4gICAgICAgIHRlc3ROdW1iZXIgPSAnMScsXG4gICAgICAgIG1heCA9IDAsXG4gICAgICAgIHJlc2lkdWU7XG5cbiAgICBpZiAoIGRpZ2l0c0xlbmd0aCA8PSAxICl7XG4gICAgICAgIG1heCA9IDEwO1xuICAgICAgICByZXR1cm4gbWF4O1xuICAgIH1cblxuICAgIHdoaWxlICggemVyb3NOdW1iZXIgKSB7XG4gICAgICAgIHRlc3ROdW1iZXIgKz0gJzAnO1xuICAgICAgICB6ZXJvc051bWJlci0tO1xuICAgIH1cbiAgICB0ZXN0TnVtYmVyID0gK3Rlc3ROdW1iZXI7XG5cbiAgICByZXNpZHVlID0gdmFsdWUgJSB0ZXN0TnVtYmVyO1xuICAgIHJvdW5kZWQgPSB2YWx1ZSArICh0ZXN0TnVtYmVyIC0gcmVzaWR1ZSk7XG5cbiAgICBpZiAoIHZhbHVlIDwgMTAwICl7XG4gICAgICAgIHJvdW5kZWQgPSByb3VuZGVkLnRvU3RyaW5nKCkuc3BsaXQoJycpO1xuICAgICAgICByb3VuZGVkWzBdID0gK3JvdW5kZWRbMF0gPiA1ID8gJzEwJzogJzUnO1xuICAgICAgICBtYXggPSArKHJvdW5kZWQuam9pbignJykpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIG1heCA9IHJvdW5kZWQ7XG4gICAgfVxuICAgIHJldHVybiBtYXg7XG59XG5cbkNoYXJ0LnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbiAoZGF0YSl7XG5cbiAgICB2YXIgbWF4ID0gZDMubWF4KGRhdGEsIGZ1bmN0aW9uIChpdGVtKXtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgICAgICB9KSxcbiAgICAgICAgeSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMCwgdGhpcy5fZ2V0VG9wVmFsdWUobWF4KV0pLnJhbmdlKFtoZWlnaHQsIDBdKSxcbiAgICAgICAgc2NhbGVEYXRhID0geS50aWNrcyg0KS5tYXAoeS50aWNrRm9ybWF0KDQsIFwiZFwiKSksXG4gICAgICAgIGNoYXJ0V2lkdGggPSBkYXRhLmxlbmd0aCAqIGJhcldpZHRoLFxuICAgICAgICBtb250aHNEYXRhID0gdGhpcy5fZ2V0TW9udGhzRGF0YShkYXRhKTtcblxuXG4gICAgLy8gc2V0IHRoZSBjYW52YXMgd2lkdGhcbiAgICBjaGFydC5hdHRyKCd3aWR0aCcsIGNoYXJ0V2lkdGgpO1xuXG4gICAgLy8gY2xlYXIgY2FudmFzXG4gICAgY2hhcnQuc2VsZWN0QWxsKCcqJykucmVtb3ZlKCk7XG5cbiAgICBjaGFydC5hcHBlbmQoJ2xpbmUnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAneDEnOiAwLFxuICAgICAgICAgICAgJ3kxJzogaGVpZ2h0LFxuICAgICAgICAgICAgJ3gyJzogY2hhcnRXaWR0aCxcbiAgICAgICAgICAgICd5Mic6IGhlaWdodCxcbiAgICAgICAgICAgICdjbGFzcyc6ICd0aW1lbGluZSdcbiAgICAgICAgfSk7XG5cbiAgICAvLyBkcmF3IG1vbnRoIHRpY2tzXG4gICAgdmFyIG1vbnRoVGljayA9IGNoYXJ0LnNlbGVjdEFsbCgnZy5tb250aF90aWNrJylcbiAgICAgICAgLmRhdGEobW9udGhzRGF0YSlcbiAgICAgICAgLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBkLm1hcmdpbiArICcsIDApJzsgfSxcbiAgICAgICAgICAgICdjbGFzcyc6ICdtb250aF90aWNrJ1xuICAgICAgICB9KTtcblxuICAgIG1vbnRoVGljay5hcHBlbmQoJ2xpbmUnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAneDEnOiAwLFxuICAgICAgICAgICAgJ3kxJzogMCxcbiAgICAgICAgICAgICd4Mic6IDAsXG4gICAgICAgICAgICAneTInOiBoZWlnaHRcbiAgICAgICAgfSk7XG5cbiAgICBtb250aFRpY2suYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3gnOiAxMCxcbiAgICAgICAgICAgICd5JzogMzJcbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24gKGQpeyByZXR1cm4gZC50ZXh0IH0pO1xuXG4gICAgLy8gZHJhdyBzY2FsZVxuICAgIHNjYWxlLnNlbGVjdCgnZycpLnJlbW92ZSgpO1xuXG4gICAgc2NhbGUuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2F4aXMnKVxuICAgICAgICAuY2FsbChkMy5zdmcuYXhpcygpXG4gICAgICAgICAgICAuc2NhbGUoeSlcbiAgICAgICAgICAgIC5vcmllbnQoJ3JpZ2h0JylcbiAgICAgICAgICAgIC50aWNrcyg0KVxuICAgICAgICAgICAgLnRpY2tGb3JtYXQoIGQzLmZvcm1hdCgncycpICkgKTtcblxuICAgIC8vIGRyYXcgYmFyc1xuXG4gICAgaWYgKCBjb25maWcucGVyaW9kID09PSAnZGFpbHknICl7XG4gICAgICAgIHRoaXMuX2RyYXdEYWlseUJhcnMoZGF0YSwgeSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fZHJhd0dyb3NzQmFycyhkYXRhLCB5KTtcbiAgICB9XG59XG5cbkNoYXJ0LnByb3RvdHlwZS5fZHJhd0RhaWx5QmFycyA9IGZ1bmN0aW9uIChkYXRhLCB5KSB7XG4gICAgdmFyIGJhciA9IGNoYXJ0LnNlbGVjdEFsbCgnZy5iYXInKVxuICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuICd0cmFuc2xhdGUoJyArIGkgKiBiYXJXaWR0aCArICcsIDApJzsgfSxcbiAgICAgICAgICAgICdjbGFzcyc6ICdiYXInXG4gICAgICAgIH0pO1xuXG5cbiAgICBiYXIuYXBwZW5kKCdyZWN0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3NoYXBlLXJlbmRlcmluZyc6ICdjcmlzcEVkZ2VzJyxcbiAgICAgICAgICAgICdmaWxsJzogJ3JnYmEoNTcsIDE4NiwgMTMwLCAwLjMpJyxcbiAgICAgICAgICAgICd3aWR0aCc6IGJhcldpZHRoLFxuICAgICAgICAgICAgJ2hlaWdodCc6IGZ1bmN0aW9uIChkKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gaGVpZ2h0IC0geShkLnZhbHVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgwLCcrIHkoZC52YWx1ZSkgKyAnKSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgYmFyLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdzaGFwZS1yZW5kZXJpbmcnOiAnY3Jpc3BFZGdlcycsXG4gICAgICAgICAgICAnZmlsbCc6ICdyZ2JhKDU3LCAxODYsIDEzMCwgMSknLFxuICAgICAgICAgICAgJ3dpZHRoJzogYmFyV2lkdGgsXG4gICAgICAgICAgICAnaGVpZ2h0JzogMixcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbiAoZCwgaSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAndHJhbnNsYXRlKDAsJysgeShkLnZhbHVlKSArICcpJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICBiYXIuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2NsYXNzJzogJ3ZhbHVlJyxcbiAgICAgICAgICAgICd4JzogYmFyV2lkdGggLyAyLFxuICAgICAgICAgICAgJ3knOiBmdW5jdGlvbiAoZCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHkoZC52YWx1ZSkgLSA1O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAudGV4dChmdW5jdGlvbihkKSB7IHJldHVybiBkLnZhbHVlOyB9KTtcblxuICAgIHRoaXMuX2RyYXdUaW1lbGluZShiYXIpO1xufVxuXG5DaGFydC5wcm90b3R5cGUuX2RyYXdHcm9zc0JhcnMgPSBmdW5jdGlvbiAoZGF0YSwgeSl7XG4gICAgdmFyIGFyZWEgPSBkMy5zdmcuYXJlYSgpXG4gICAgICAgIC5pbnRlcnBvbGF0ZSgnbW9ub3RvbmUnKVxuICAgICAgICAueChmdW5jdGlvbihkLCBpKSB7IHJldHVybiBpICogYmFyV2lkdGggKyAoYmFyV2lkdGggLyAyKTsgfSlcbiAgICAgICAgLnkwKGhlaWdodClcbiAgICAgICAgLnkxKGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIHkoZC52YWx1ZSk7IH0pO1xuXG4gICAgY2hhcnQuYXBwZW5kKCdwYXRoJylcbiAgICAgICAgLmRhdHVtKGRhdGEpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdjbGFzcyc6ICdhcmVhJyxcbiAgICAgICAgICAgICdkJzogYXJlYVxuICAgICAgICB9KTtcblxuXG4gICAgdmFyIGxpbmUgPSBkMy5zdmcubGluZSgpXG4gICAgICAgIC54KGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuIGkgKiBiYXJXaWR0aCArIChiYXJXaWR0aCAvIDIpOyB9KVxuICAgICAgICAueShmdW5jdGlvbihkLCBpKSB7IHJldHVybiB5KGQudmFsdWUpOyB9KVxuICAgICAgICAuaW50ZXJwb2xhdGUoJ2xpbmVhcicpO1xuXG4gICAgY2hhcnQuYXBwZW5kKCdwYXRoJylcbiAgICAgICAgLmRhdHVtKGRhdGEpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdjbGFzcyc6ICdjdXJ2ZScsXG4gICAgICAgICAgICAnZCc6IGxpbmVcbiAgICAgICAgfSk7XG5cbiAgICB2YXIgYmFyID0gY2hhcnQuc2VsZWN0QWxsKCdnLmJhcicpXG4gICAgICAgIC5kYXRhKGRhdGEpXG4gICAgICAgIC5lbnRlcigpXG4gICAgICAgIC5hcHBlbmQoJ2cnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAndHJhbnNmb3JtJzogZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gJ3RyYW5zbGF0ZSgnICsgaSAqIGJhcldpZHRoICsgJywgMCknOyB9LFxuICAgICAgICAgICAgJ2NsYXNzJzogJ2JhcidcbiAgICAgICAgfSk7XG5cbiAgICBiYXIuYXBwZW5kKCdjaXJjbGUnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnY2xhc3MnOiAnY2lyY2xlX3N0cm9rZScsXG4gICAgICAgICAgICAncic6IDYsXG4gICAgICAgICAgICAnY3gnOiBiYXJXaWR0aCAvIDIsXG4gICAgICAgICAgICAnY3knOiBmdW5jdGlvbiAoZCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQoeShkLnZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgYmFyLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2NsYXNzJzogJ2NpcmNsZScsXG4gICAgICAgICAgICAncic6IDQsXG4gICAgICAgICAgICAnY3gnOiBiYXJXaWR0aCAvIDIsXG4gICAgICAgICAgICAnY3knOiBmdW5jdGlvbiAoZCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIE1hdGgucm91bmQoeShkLnZhbHVlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgdGhpcy5fZHJhd1RpbWVsaW5lKGJhcik7XG59XG5cbkNoYXJ0LnByb3RvdHlwZS5fZHJhd1RpbWVsaW5lID0gZnVuY3Rpb24gKGJhcil7XG4gICAgdmFyIGxpbmVIZWlnaHQgPSA1O1xuICAgIC8vIGRheXNcbiAgICBiYXIuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXG4gICAgICAgICAgICAneSc6IGhlaWdodCArIDE1LFxuICAgICAgICAgICAgJ2NsYXNzJzogZnVuY3Rpb24gKGQpe1xuICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gKGRheSA9PT0gMCB8fCBkYXkgPT09IDYpICYmIGNvbmZpZy5zaG93V2Vla2RheXMgPyAnZGF0ZSBob2xpZGF5JzogJ2RhdGUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAudGV4dCggZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICByZXR1cm4gZC5rZXkuZ2V0RGF0ZSgpO1xuICAgICAgICB9KTtcblxuICAgIC8vIHdlZWtkYXlzXG4gICAgaWYgKCBjb25maWcuc2hvd1dlZWtkYXlzICkge1xuICAgICAgICBiYXIuYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICAgICAneCc6IGJhcldpZHRoIC8gMixcbiAgICAgICAgICAgICAgICAneSc6IGhlaWdodCArIDMwLFxuICAgICAgICAgICAgICAgICdjbGFzcyc6IGZ1bmN0aW9uIChkKXtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRheSA9IGQua2V5LmdldERheSgpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF5ID09PSAwIHx8IGRheSA9PT0gNiA/ICd3ZWVrZGF5IGhvbGlkYXknOiAnd2Vla2RheSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIC50ZXh0KCBmdW5jdGlvbihkKXtcbiAgICAgICAgICAgICAgICB2YXIgZGF5ID0gZC5rZXkuZ2V0RGF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHdlZWtkYXlzW2RheV07XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICBsaW5lSGVpZ2h0ID0gMzA7XG4gICAgfVxuXG4gICAgLy8gZGl2aWRlclxuICAgIGJhci5hcHBlbmQoJ2xpbmUnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAneDEnOiBiYXJXaWR0aCxcbiAgICAgICAgICAgICd5MSc6IGhlaWdodCxcbiAgICAgICAgICAgICd4Mic6IGJhcldpZHRoLFxuICAgICAgICAgICAgJ3kyJzogaGVpZ2h0ICsgbGluZUhlaWdodCxcbiAgICAgICAgICAgICdjbGFzcyc6ICd0aW1lbGluZSdcbiAgICAgICAgfSk7XG59XG5cbkNoYXJ0LnByb3RvdHlwZS5jaGFuZ2VWaWRlbyA9IGZ1bmN0aW9uICh2YWx1ZSl7XG4gICAgY29uZmlnLnZpZGVvID0gdmFsdWU7XG4gICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKCk7XG5cbiAgICB0aGlzLnJlbmRlcihjaGFydERhdGEpO1xufTtcblxuQ2hhcnQucHJvdG90eXBlLmNoYW5nZUFjdGl2aXR5ID0gZnVuY3Rpb24gKHZhbHVlKXtcbiAgICBjb25maWcuYWN0aXZpdHkgPSB2YWx1ZTtcbiAgICB2YXIgY2hhcnREYXRhID0gdGhpcy5nZXRDaGFydERhdGEoKTtcblxuICAgIHRoaXMucmVuZGVyKGNoYXJ0RGF0YSk7XG59O1xuXG5DaGFydC5wcm90b3R5cGUuY2hhbmdlUGVyaW9kID0gZnVuY3Rpb24gKHZhbHVlKXtcbiAgICBjb25maWcucGVyaW9kID0gdmFsdWU7XG4gICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKCk7XG5cbiAgICB0aGlzLnJlbmRlcihjaGFydERhdGEpO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBDaGFydDtcbiIsInZhciBDaGFydCA9IHJlcXVpcmUoJy4vY2hhcnQnKSxcbiAgICBjaGFydCA9IG5ldyBDaGFydCgpLFxuICAgIHZpZGVvU2VsZWN0ID0gZDMuc2VsZWN0KCcjdmlkZW9fc2VsZWN0JyksXG4gICAgc3dpdGNoZXJzID0gZDMuc2VsZWN0QWxsKCcuc3dpdGNoZXInKVxuXG5mdW5jdGlvbiBDb250cm9sbGVyICgpe1xuICAgIC8vIG1ha2UgdGhpcyBjbGFzcyBhIHNpbmdsZXRvblxuICAgIGlmICggYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgKSB7XG4gICAgICAgIHJldHVybiBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZTtcbiAgICB9XG4gICAgYXJndW1lbnRzLmNhbGxlZS5fc2luZ2xldG9uSW5zdGFuY2UgPSB0aGlzOyAgIFxufVxuXG5Db250cm9sbGVyLnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24gKGRhdGEpe1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLmRhdGEgPSBkYXRhO1xuXG4gICAgdGhpcy52aWRlb1NlbGVjdCA9IHZpZGVvU2VsZWN0O1xuXG4gICAgdGhpcy5fZmlsbFZpZGVvU2VsZWN0KCk7XG4gICAgLy8gYXR0YWNoIGV2ZW50c1xuICAgIHN3aXRjaGVycy5zZWxlY3RBbGwoJ3NwYW4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZSl7XG4gICAgICAgIHZhciB0YXJnZXQgPSBkMy5zZWxlY3QodGhpcyksXG4gICAgICAgICAgICBwYXJlbnQgPSBkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlKSxcbiAgICAgICAgICAgIGFjdGlvbiA9IHRoaXMucGFyZW50Tm9kZS5kYXRhc2V0LmFjdGlvbixcbiAgICAgICAgICAgIHZhbHVlID0gdGhpcy5kYXRhc2V0LnZhbHVlO1xuXG4gICAgICAgIHBhcmVudC5zZWxlY3RBbGwoJ3NwYW4nKS5jbGFzc2VkKCdhY3RpdmUnLCBmYWxzZSk7XG4gICAgICAgIHRhcmdldC5jbGFzc2VkKCdhY3RpdmUnLCB0cnVlKTtcblxuICAgICAgICBzZWxmW2FjdGlvbl0odmFsdWUpO1xuICAgIH0pO1xuXG4gICAgdmlkZW9TZWxlY3Qub24oJ2NoYW5nZScsIGZ1bmN0aW9uIChlKXtcbiAgICAgICAgdmFyIHZpZGVvSW5kZXggPSArdGhpcy52YWx1ZTtcblxuICAgICAgICBjaGFydC5jaGFuZ2VWaWRlbyh2aWRlb0luZGV4KTtcbiAgICB9KTtcbn07XG5cbkNvbnRyb2xsZXIucHJvdG90eXBlLl9maWxsVmlkZW9TZWxlY3QgPSBmdW5jdGlvbiAoKXtcbiAgICB2YXIgdmlkZW9OYW1lcyA9IHRoaXMuZGF0YS5tYXAoZnVuY3Rpb24gKGl0ZW0sIGkpeyByZXR1cm4gaXRlbS5uYW1lOyB9KSxcbiAgICAgICAgdmlkZW9VcGRhdGUgPSB2aWRlb1NlbGVjdC5zZWxlY3RBbGwoJ29wdGlvbnMnKS5kYXRhKHZpZGVvTmFtZXMpO1xuXG4gICAgdmlkZW9VcGRhdGVcbiAgICAuZW50ZXIoKVxuICAgIC5hcHBlbmQoJ29wdGlvbicpXG4gICAgLnRleHQoZnVuY3Rpb24gKGQpe1xuICAgICAgICByZXR1cm4gZDtcbiAgICB9KVxuICAgIC5hdHRyKCd2YWx1ZScsIGZ1bmN0aW9uIChkKXtcbiAgICAgICAgcmV0dXJuIHZpZGVvTmFtZXMuaW5kZXhPZihkKTtcbiAgICB9KTtcbn07XG5cbkNvbnRyb2xsZXIucHJvdG90eXBlLnN3aXRjaEFjdGl2aXR5ID0gZnVuY3Rpb24gKHZhbHVlKXtcbiAgICBjaGFydC5jaGFuZ2VBY3Rpdml0eSh2YWx1ZSk7XG59O1xuXG5Db250cm9sbGVyLnByb3RvdHlwZS5zd2l0Y2hQZXJpb2QgPSBmdW5jdGlvbiAodmFsdWUpe1xuICAgIGNoYXJ0LmNoYW5nZVBlcmlvZCh2YWx1ZSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IENvbnRyb2xsZXI7Il19
