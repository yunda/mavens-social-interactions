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

        self._placeRightTile(scrollLeft);
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
    this._placeRightTile(scrollLeft);
};

Chart.prototype._placeRightTile = function (scrollLeft){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy95dW5kYS9EZXNrdG9wL21hdmVucy1zb2NpYWwtaW50ZXJhY3Rpb25zL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3l1bmRhL0Rlc2t0b3AvbWF2ZW5zLXNvY2lhbC1pbnRlcmFjdGlvbnMvanMvYXBwLmpzIiwiL1VzZXJzL3l1bmRhL0Rlc2t0b3AvbWF2ZW5zLXNvY2lhbC1pbnRlcmFjdGlvbnMvanMvY2hhcnQuanMiLCIvVXNlcnMveXVuZGEvRGVza3RvcC9tYXZlbnMtc29jaWFsLWludGVyYWN0aW9ucy9qcy9jb250cm9sbGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBDaGFydCA9IHJlcXVpcmUoJy4vY2hhcnQnKSxcbiAgICBDb250b2xsZXIgPSByZXF1aXJlKCcuL2NvbnRyb2xsZXInKTtcblxuLy8gcmV0cmlldmUgZGF0YVxuZDMuanNvbignLi9kYXRhLmpzb24nLCBpbml0KTtcblxuZnVuY3Rpb24gaW5pdCAoZXJyLCBkYXRhKXtcbiAgICB2YXIgY29udG9sbGVyID0gbmV3IENvbnRvbGxlcigpLFxuICAgICAgICBjaGFydCA9IG5ldyBDaGFydCgpO1xuXG4gICAgY29udG9sbGVyLmluaXQoZGF0YSk7XG4gICAgY2hhcnQuaW5pdChkYXRhKTtcblxufSIsInZhciBoZWlnaHQgPSAzMDAsXG4gICAgYmFyV2lkdGggPSA0MCxcbiAgICBzY3JvbGxXcmFwcGVyID0gZDMuc2VsZWN0KCcuc2Nyb2xsX3dyYXBwZXInKSxcbiAgICBjaGFydCA9IGQzLnNlbGVjdCgnI2NoYXJ0JykuYXBwZW5kKCdzdmcnKS5hdHRyKCdoZWlnaHQnLCBoZWlnaHQgKyA0MCksXG4gICAgc2NhbGUgPSBkMy5zZWxlY3QoJyNzY2FsZScpLmFwcGVuZCgnc3ZnJykuYXR0cih7ICdoZWlnaHQnOiBoZWlnaHQgKyAyMCwgJ3dpZHRoJzo2MCB9KSxcbiAgICBtb250aFRpbGUgPSBkMy5zZWxlY3QoJyNtb250aF90aWxlJykuYXBwZW5kKCdzdmcnKS5hdHRyKHsgJ2hlaWdodCc6IGhlaWdodCwgJ3dpZHRoJzogMjAwIH0pLFxuICAgIG1vbnRocyA9IFsnSmFudWFyeScsICdGZWJydWFyeScsICdNYXJjaCcsICdBcHJpbCcsICdNYXknLCAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlciddLFxuICAgIHdlZWtkYXlzID0gWydTVU4nLCAnTU9OJywgJ1RVRScsICdXRUQnLCAnVEhVJywgJ0ZSSScsICdTQVQnXSxcblxuICAgIC8vIGRlZmF1bHQgY29uZmlnXG4gICAgY29uZmlnID0ge1xuICAgICAgICB2aWRlbzogMCxcbiAgICAgICAgYWN0aXZpdHk6ICd2aWV3cycsXG4gICAgICAgIHBlcmlvZDogJ2RhaWx5JyxcbiAgICAgICAgc2hvd1dlZWtkYXlzOiB0cnVlXG4gICAgfTtcblxuXG4vLyBjb25zdHJ1Y3RvclxuZnVuY3Rpb24gQ2hhcnQgKCl7XG4gICAgLy8gbWFrZSB0aGlzIGNsYXNzIGEgc2luZ2xldG9uXG4gICAgaWYgKCBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZSApIHtcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlO1xuICAgIH1cbiAgICBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZSA9IHRoaXM7XG5cbn1cblxuQ2hhcnQucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoZGF0YSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZGF0YSA9IGRhdGE7XG4gICAgdGhpcy5jb25maWcgPSBjb25maWc7XG5cbiAgICB2YXIgY2hhcnREYXRhID0gdGhpcy5nZXRDaGFydERhdGEoKTtcbiAgICB0aGlzLm1vbnRoVGlja3NPZmZzZXRzID0gW107XG5cbiAgICB0aGlzLnJlbmRlcihjaGFydERhdGEpO1xuXG4gICAgc2Nyb2xsV3JhcHBlci5vbignc2Nyb2xsJywgZnVuY3Rpb24gKCl7XG4gICAgICAgIHZhciBzY3JvbGxMZWZ0ID0gdGhpcy5zY3JvbGxMZWZ0O1xuXG4gICAgICAgIHNlbGYuX3BsYWNlUmlnaHRUaWxlKHNjcm9sbExlZnQpO1xuICAgIH0pO1xufTtcblxuQ2hhcnQucHJvdG90eXBlLl9nZXRNb250aHNEYXRhID0gZnVuY3Rpb24gKGNoYXJ0RGF0YSl7XG4gICAgdmFyIG1vbnRoc0RhdGEgPSBbXTtcblxuICAgIC8vIGZpbGwgbW9udGhzIGRhdGFcbiAgICBjaGFydERhdGEuZm9yRWFjaCgoZnVuY3Rpb24gKCl7XG4gICAgICAgIHZhciBjdXJyZW50TW9udGggPSAnJztcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChpdGVtLCBpKXtcbiAgICAgICAgICAgIC8vIHVzZSBkMy50aW1lLmZvcm1hdChcIiViICVZXCIpLnBhcnNlO1xuICAgICAgICAgICAgdmFyIG1vbnRoID0gbW9udGhzW2l0ZW0ua2V5LmdldE1vbnRoKCldLFxuICAgICAgICAgICAgICAgIHllYXIgPSAgaXRlbS5rZXkuZ2V0RnVsbFllYXIoKSxcbiAgICAgICAgICAgICAgICBtb250aFN0cmluZyA9IG1vbnRoc1tpdGVtLmtleS5nZXRNb250aCgpXSArICcgJyArIGl0ZW0ua2V5LmdldEZ1bGxZZWFyKCk7XG5cbiAgICAgICAgICAgIGlmICggbW9udGhTdHJpbmcgIT09IGN1cnJlbnRNb250aCApIHtcbiAgICAgICAgICAgICAgICBtb250aHNEYXRhLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBtb250aFN0cmluZzogbW9udGhTdHJpbmcsXG4gICAgICAgICAgICAgICAgICAgIG1vbnRoOiBtb250aCxcbiAgICAgICAgICAgICAgICAgICAgeWVhcjogeWVhcixcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiBpICogYmFyV2lkdGhcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGN1cnJlbnRNb250aCA9IG1vbnRoU3RyaW5nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSkoKSk7XG5cbiAgICByZXR1cm4gbW9udGhzRGF0YTtcbn07XG5cbkNoYXJ0LnByb3RvdHlwZS5fZHJhd01vbnRoVGlja3MgPSBmdW5jdGlvbiAobW9udGhzRGF0YSl7XG4gICAgdmFyIHNjcm9sbExlZnQgPSBzY3JvbGxXcmFwcGVyLm5vZGUoKS5zY3JvbGxMZWZ0LFxuICAgICAgICBtb250aFRpY2tzID0gY2hhcnQuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoeyAnY2xhc3MnOiAnbW9udGhfdGlja3MnIH0pO1xuXG4gICAgdmFyIG1vbnRoVGljayA9IG1vbnRoVGlja3Muc2VsZWN0QWxsKCdnLm1vbnRoX3RpY2snKVxuICAgICAgICAuZGF0YShtb250aHNEYXRhKVxuICAgICAgICAuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuICd0cmFuc2xhdGUoJyArIGQub2Zmc2V0ICsgJywgMCknOyB9LFxuICAgICAgICAgICAgJ2NsYXNzJzogJ21vbnRoX3RpY2snXG4gICAgICAgIH0pO1xuXG4gICAgbW9udGhUaWNrLmFwcGVuZCgnbGluZScpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICd4MSc6IDAsXG4gICAgICAgICAgICAneTEnOiAwLFxuICAgICAgICAgICAgJ3gyJzogMCxcbiAgICAgICAgICAgICd5Mic6IGhlaWdodFxuICAgICAgICB9KTtcblxuICAgIHZhciBtb250aFRleHQgPSBtb250aFRpY2suYXBwZW5kKCd0ZXh0JylcbiAgICAgICAgLmF0dHIoeyAneCc6IDEwLCAneSc6IDAgfSk7XG5cbiAgICBtb250aFRleHQuYXBwZW5kKCd0c3BhbicpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdkeSc6ICc0MHB4JyxcbiAgICAgICAgICAgICd4JzogJzEwJyxcbiAgICAgICAgICAgICdjbGFzcyc6ICdtb250aF90aWNrX21vbnRoJ1xuICAgICAgICB9KVxuICAgICAgICAudGV4dChmdW5jdGlvbiAoZCl7IHJldHVybiBkLm1vbnRoIH0pO1xuXG4gICAgbW9udGhUZXh0LmFwcGVuZCgndHNwYW4nKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnZHknOiAnNDBweCcsXG4gICAgICAgICAgICAneCc6ICcxMCcsXG4gICAgICAgICAgICAnY2xhc3MnOiAnbW9udGhfdGlja195ZWFyJ1xuICAgICAgICB9KVxuICAgICAgICAudGV4dChmdW5jdGlvbiAoZCl7IHJldHVybiBkLnllYXIgfSk7XG5cbiAgICAvLyBjb3B5IG1vbnRoIHRpY2tzIHRvIHRoZSBtb250aCB0aWxlXG4gICAgbW9udGhUaWxlLm5vZGUoKS5hcHBlbmRDaGlsZChjaGFydC5zZWxlY3QoJ2cubW9udGhfdGlja3MnKS5ub2RlKCkuY2xvbmVOb2RlKHRydWUpKTtcblxuICAgIHRoaXMudGlsZU1vbnRoVGlja3MgPSBtb250aFRpbGUuc2VsZWN0QWxsKCcubW9udGhfdGljaycpO1xuXG4gICAgdGhpcy50aWxlTW9udGhUaWNrcy5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKDAsIDApJyk7XG5cbiAgICB0aGlzLm1vbnRoVGlja3MgPSBjaGFydC5zZWxlY3RBbGwoJy5tb250aF90aWNrJyk7XG5cblxuICAgIC8vIGdldCBuZXNzYWNlcnkgdGlja3MgZGV0YWlsc1xuICAgIHRoaXMubW9udGhUaWNrc09mZnNldHMgPSBtb250aHNEYXRhLm1hcChmdW5jdGlvbiAoaXRlbSwgaSwgYXJyKXtcbiAgICAgICAgdmFyIG5leHQgPSBhcnJbaSArIDFdLFxuICAgICAgICAgICAgZWRnZSA9IG5leHQgPyBuZXh0Lm9mZnNldCA6IHRoaXMuY2hhcnRXaWR0aDtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgb2Zmc2V0OiBpdGVtLm9mZnNldCxcbiAgICAgICAgICAgIGVkZ2U6IGVkZ2VcbiAgICAgICAgfTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgLy8gcGxhY2UgdGhlIHJpZ2h0IHRpbGVcbiAgICB0aGlzLmN1cnJlbnRUaWxlSW5kZXggPSBudWxsO1xuICAgIHRoaXMuX3BsYWNlUmlnaHRUaWxlKHNjcm9sbExlZnQpO1xufTtcblxuQ2hhcnQucHJvdG90eXBlLl9wbGFjZVJpZ2h0VGlsZSA9IGZ1bmN0aW9uIChzY3JvbGxMZWZ0KXtcbiAgICB2YXIgcmlnaHRUaWxlSW5kZXggPSAwLFxuICAgICAgICBjdXJyZW50VGlsZURldGFpbHM7XG5cbiAgICB0aGlzLm1vbnRoVGlja3NPZmZzZXRzLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0sIGkpe1xuICAgICAgICBpZiAoIHNjcm9sbExlZnQgPj0gaXRlbS5vZmZzZXQgJiYgc2Nyb2xsTGVmdCA8PSBpdGVtLmVkZ2UgKSB7XG4gICAgICAgICAgICByaWdodFRpbGVJbmRleCA9IGk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGlmICggdGhpcy5jdXJyZW50VGlsZUluZGV4ICE9PSByaWdodFRpbGVJbmRleCApIHtcbiAgICAgICAgdGhpcy5tb250aFRpY2tzLmNsYXNzZWQoJ2hpZGRlbicsIGZhbHNlKS5maWx0ZXIoJzpudGgtY2hpbGQoJysgKHJpZ2h0VGlsZUluZGV4KzEpICsnKScpLmNsYXNzZWQoJ2hpZGRlbicsIHRydWUpO1xuXG4gICAgICAgIHRoaXMuY3VycmVudFRpbGUgPSB0aGlzLnRpbGVNb250aFRpY2tzLmZpbHRlcignOm50aC1jaGlsZCgnKyAocmlnaHRUaWxlSW5kZXgrMSkgKycpJyk7XG5cbiAgICAgICAgdGhpcy50aWxlTW9udGhUaWNrcy5jbGFzc2VkKCdoaWRkZW4nLCB0cnVlKTtcblxuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlLmNsYXNzZWQoJ2hpZGRlbicsIGZhbHNlKTtcblxuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlSW5kZXggPSByaWdodFRpbGVJbmRleDtcbiAgICB9XG5cbiAgICBjdXJyZW50VGlsZURldGFpbHMgPSB0aGlzLm1vbnRoVGlja3NPZmZzZXRzW3RoaXMuY3VycmVudFRpbGVJbmRleF07XG5cbiAgICBpZiAoIHNjcm9sbExlZnQgPiAoY3VycmVudFRpbGVEZXRhaWxzLmVkZ2UgLSAyMDApICkge1xuICAgICAgICB0aGlzLmN1cnJlbnRUaWxlLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIChjdXJyZW50VGlsZURldGFpbHMuZWRnZSAtIChzY3JvbGxMZWZ0ICsgMjAwKSkgKyAnLCAwKScpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuY3VycmVudFRpbGUuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgwLCAwKScpO1xuICAgIH1cbn07XG5cbkNoYXJ0LnByb3RvdHlwZS5nZXRDaGFydERhdGEgPSBmdW5jdGlvbiAoKXtcbiAgICAvLyBnZXQgYW4gYXJyYXkgb2Yga2V5LXZhbHVlIG9iamVjdHNcbiAgICB2YXIgZGF0YUhhc2ggPSB0aGlzLmRhdGFbY29uZmlnLnZpZGVvXVtjb25maWcuYWN0aXZpdHldLFxuICAgICAgICBkYXRhID0gZDMubWFwKGRhdGFIYXNoKS5lbnRyaWVzKCk7XG5cbiAgICAvLyBwYXJzZSBkYXRlIHN0cmluZ3NcbiAgICBkYXRhLmZvckVhY2goZnVuY3Rpb24gKGl0ZW0pe1xuICAgICAgICBpdGVtLmtleSA9IG5ldyBEYXRlKGl0ZW0ua2V5KTtcbiAgICB9KTtcblxuICAgIC8vIHNvcnQgZGF0YSBieSBkYXRlXG4gICAgZGF0YSA9IGRhdGEuc29ydChmdW5jdGlvbiAoYSwgYil7XG4gICAgICAgIHZhciBhVGltZSA9IGEua2V5LmdldFRpbWUoKSxcbiAgICAgICAgICAgIGJUaW1lID0gYi5rZXkuZ2V0VGltZSgpO1xuICAgICAgICByZXR1cm4gYVRpbWUgLSBiVGltZTtcbiAgICB9KTtcblxuICAgIGlmICggY29uZmlnLnBlcmlvZCA9PT0gJ2RhaWx5JyApIHtcbiAgICAgICAgLy8gbWFrZSBkYWlseSB2YWx1ZXNcbiAgICAgICAgZGF0YSA9IGRhdGEubWFwKGZ1bmN0aW9uIChpdGVtLCBpKXtcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB7IGtleTogaXRlbS5rZXkgfTtcblxuICAgICAgICAgICAgaWYgKCBpID4gMCApe1xuICAgICAgICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IGl0ZW0udmFsdWUgLSBkYXRhW2kgLSAxXS52YWx1ZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnZhbHVlID0gaXRlbS52YWx1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xufVxuXG5DaGFydC5wcm90b3R5cGUuX2dldFRvcFZhbHVlID0gZnVuY3Rpb24gKHZhbHVlKXtcbiAgICB2YXIgZGlnaXRzTGVuZ3RoID0gdmFsdWUudG9TdHJpbmcoKS5sZW5ndGgsXG4gICAgICAgIHplcm9zTnVtYmVyID0gZGlnaXRzTGVuZ3RoIC0gMSxcbiAgICAgICAgdGVzdE51bWJlciA9ICcxJyxcbiAgICAgICAgbWF4ID0gMCxcbiAgICAgICAgcmVzaWR1ZTtcblxuICAgIGlmICggZGlnaXRzTGVuZ3RoIDw9IDEgKXtcbiAgICAgICAgbWF4ID0gMTA7XG4gICAgICAgIHJldHVybiBtYXg7XG4gICAgfVxuXG4gICAgd2hpbGUgKCB6ZXJvc051bWJlciApIHtcbiAgICAgICAgdGVzdE51bWJlciArPSAnMCc7XG4gICAgICAgIHplcm9zTnVtYmVyLS07XG4gICAgfVxuICAgIHRlc3ROdW1iZXIgPSArdGVzdE51bWJlcjtcblxuICAgIHJlc2lkdWUgPSB2YWx1ZSAlIHRlc3ROdW1iZXI7XG4gICAgcm91bmRlZCA9IHZhbHVlICsgKHRlc3ROdW1iZXIgLSByZXNpZHVlKTtcblxuICAgIGlmICggdmFsdWUgPCAxMDAgKXtcbiAgICAgICAgcm91bmRlZCA9IHJvdW5kZWQudG9TdHJpbmcoKS5zcGxpdCgnJyk7XG4gICAgICAgIHJvdW5kZWRbMF0gPSArcm91bmRlZFswXSA+IDUgPyAnMTAnOiAnNSc7XG4gICAgICAgIG1heCA9ICsocm91bmRlZC5qb2luKCcnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbWF4ID0gcm91bmRlZDtcbiAgICB9XG4gICAgcmV0dXJuIG1heDtcbn1cblxuQ2hhcnQucHJvdG90eXBlLnJlbmRlciA9IGZ1bmN0aW9uIChkYXRhKXtcbiAgICB2YXIgbWF4ID0gZDMubWF4KGRhdGEsIGZ1bmN0aW9uIChpdGVtKXtcbiAgICAgICAgICAgIHJldHVybiBpdGVtLnZhbHVlO1xuICAgICAgICB9KSxcbiAgICAgICAgeSA9IGQzLnNjYWxlLmxpbmVhcigpLmRvbWFpbihbMCwgdGhpcy5fZ2V0VG9wVmFsdWUobWF4KV0pLnJhbmdlKFtoZWlnaHQsIDBdKSxcbiAgICAgICAgc2NhbGVEYXRhID0geS50aWNrcyg0KS5tYXAoeS50aWNrRm9ybWF0KDQsIFwiZFwiKSksXG4gICAgICAgIGNoYXJ0V2lkdGggPSBkYXRhLmxlbmd0aCAqIGJhcldpZHRoLFxuICAgICAgICBtb250aHNEYXRhID0gdGhpcy5fZ2V0TW9udGhzRGF0YShkYXRhKTtcblxuXG4gICAgLy8gc2V0IHRoZSBjYW52YXMgd2lkdGhcbiAgICBjaGFydC5hdHRyKCd3aWR0aCcsIGNoYXJ0V2lkdGgpO1xuXG4gICAgdGhpcy5jaGFydFdpZHRoID0gY2hhcnRXaWR0aDtcblxuICAgIC8vIGNsZWFyIGNhbnZhc1xuICAgIGNoYXJ0LnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xuICAgIGQzLnNlbGVjdCgnI21vbnRoX3RpbGUnKS5zZWxlY3QoJ3N2ZycpLnNlbGVjdEFsbCgnKicpLnJlbW92ZSgpO1xuXG4gICAgY2hhcnQuYXBwZW5kKCdsaW5lJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3gxJzogMCxcbiAgICAgICAgICAgICd5MSc6IGhlaWdodCxcbiAgICAgICAgICAgICd4Mic6IGNoYXJ0V2lkdGgsXG4gICAgICAgICAgICAneTInOiBoZWlnaHQsXG4gICAgICAgICAgICAnY2xhc3MnOiAndGltZWxpbmUnXG4gICAgICAgIH0pO1xuXG4gICAgLy8gZHJhdyBtb250aCB0aWNrc1xuICAgIHRoaXMuX2RyYXdNb250aFRpY2tzKG1vbnRoc0RhdGEpO1xuXG4gICAgLy8gZHJhdyBzY2FsZVxuICAgIHNjYWxlLnNlbGVjdCgnZycpLnJlbW92ZSgpO1xuXG4gICAgc2NhbGUuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoJ2NsYXNzJywgJ2F4aXMnKVxuICAgICAgICAuY2FsbChkMy5zdmcuYXhpcygpXG4gICAgICAgICAgICAuc2NhbGUoeSlcbiAgICAgICAgICAgIC5vcmllbnQoJ3JpZ2h0JylcbiAgICAgICAgICAgIC50aWNrcyg0KVxuICAgICAgICAgICAgLnRpY2tGb3JtYXQoIGQzLmZvcm1hdCgncycpICkgKTtcblxuICAgIC8vIGRyYXcgYmFyc1xuICAgIGlmICggY29uZmlnLnBlcmlvZCA9PT0gJ2RhaWx5JyApe1xuICAgICAgICB0aGlzLl9kcmF3RGFpbHlCYXJzKGRhdGEsIHkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2RyYXdHcm9zc0JhcnMoZGF0YSwgeSk7XG4gICAgfVxufVxuXG5DaGFydC5wcm90b3R5cGUuX2RyYXdEYWlseUJhcnMgPSBmdW5jdGlvbiAoZGF0YSwgeSkge1xuICAgIHZhciBiYXIgPSBjaGFydC5zZWxlY3RBbGwoJ2cuYmFyJylcbiAgICAgICAgLmRhdGEoZGF0YSlcbiAgICAgICAgLmVudGVyKClcbiAgICAgICAgLmFwcGVuZCgnZycpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICd0cmFuc2Zvcm0nOiBmdW5jdGlvbihkLCBpKSB7IHJldHVybiAndHJhbnNsYXRlKCcgKyBpICogYmFyV2lkdGggKyAnLCAwKSc7IH0sXG4gICAgICAgICAgICAnY2xhc3MnOiAnYmFyJ1xuICAgICAgICB9KTtcblxuXG4gICAgYmFyLmFwcGVuZCgncmVjdCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdzaGFwZS1yZW5kZXJpbmcnOiAnY3Jpc3BFZGdlcycsXG4gICAgICAgICAgICAnZmlsbCc6ICdyZ2JhKDU3LCAxODYsIDEzMCwgMC4zKScsXG4gICAgICAgICAgICAnd2lkdGgnOiBiYXJXaWR0aCxcbiAgICAgICAgICAgICdoZWlnaHQnOiBmdW5jdGlvbiAoZCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGhlaWdodCAtIHkoZC52YWx1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uIChkLCBpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICd0cmFuc2xhdGUoMCwnKyB5KGQudmFsdWUpICsgJyknO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIGJhci5hcHBlbmQoJ3JlY3QnKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnc2hhcGUtcmVuZGVyaW5nJzogJ2NyaXNwRWRnZXMnLFxuICAgICAgICAgICAgJ2ZpbGwnOiAncmdiYSg1NywgMTg2LCAxMzAsIDEpJyxcbiAgICAgICAgICAgICd3aWR0aCc6IGJhcldpZHRoLFxuICAgICAgICAgICAgJ2hlaWdodCc6IDIsXG4gICAgICAgICAgICAndHJhbnNmb3JtJzogZnVuY3Rpb24gKGQsIGkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJ3RyYW5zbGF0ZSgwLCcrIHkoZC52YWx1ZSkgKyAnKSc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgYmFyLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdjbGFzcyc6ICd2YWx1ZScsXG4gICAgICAgICAgICAneCc6IGJhcldpZHRoIC8gMixcbiAgICAgICAgICAgICd5JzogZnVuY3Rpb24gKGQpe1xuICAgICAgICAgICAgICAgIHJldHVybiB5KGQudmFsdWUpIC0gNTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoZnVuY3Rpb24oZCkgeyByZXR1cm4gZC52YWx1ZTsgfSk7XG5cbiAgICB0aGlzLl9kcmF3VGltZWxpbmUoYmFyKTtcbn1cblxuQ2hhcnQucHJvdG90eXBlLl9kcmF3R3Jvc3NCYXJzID0gZnVuY3Rpb24gKGRhdGEsIHkpe1xuICAgIHZhciBhcmVhID0gZDMuc3ZnLmFyZWEoKVxuICAgICAgICAuaW50ZXJwb2xhdGUoJ21vbm90b25lJylcbiAgICAgICAgLngoZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4gaSAqIGJhcldpZHRoICsgKGJhcldpZHRoIC8gMik7IH0pXG4gICAgICAgIC55MChoZWlnaHQpXG4gICAgICAgIC55MShmdW5jdGlvbihkLCBpKSB7IHJldHVybiB5KGQudmFsdWUpOyB9KTtcblxuICAgIGNoYXJ0LmFwcGVuZCgncGF0aCcpXG4gICAgICAgIC5kYXR1bShkYXRhKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnY2xhc3MnOiAnYXJlYScsXG4gICAgICAgICAgICAnZCc6IGFyZWFcbiAgICAgICAgfSk7XG5cblxuICAgIHZhciBsaW5lID0gZDMuc3ZnLmxpbmUoKVxuICAgICAgICAueChmdW5jdGlvbihkLCBpKSB7IHJldHVybiBpICogYmFyV2lkdGggKyAoYmFyV2lkdGggLyAyKTsgfSlcbiAgICAgICAgLnkoZnVuY3Rpb24oZCwgaSkgeyByZXR1cm4geShkLnZhbHVlKTsgfSlcbiAgICAgICAgLmludGVycG9sYXRlKCdsaW5lYXInKTtcblxuICAgIGNoYXJ0LmFwcGVuZCgncGF0aCcpXG4gICAgICAgIC5kYXR1bShkYXRhKVxuICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAnY2xhc3MnOiAnY3VydmUnLFxuICAgICAgICAgICAgJ2QnOiBsaW5lXG4gICAgICAgIH0pO1xuXG4gICAgdmFyIGJhciA9IGNoYXJ0LnNlbGVjdEFsbCgnZy5iYXInKVxuICAgICAgICAuZGF0YShkYXRhKVxuICAgICAgICAuZW50ZXIoKVxuICAgICAgICAuYXBwZW5kKCdnJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3RyYW5zZm9ybSc6IGZ1bmN0aW9uKGQsIGkpIHsgcmV0dXJuICd0cmFuc2xhdGUoJyArIGkgKiBiYXJXaWR0aCArICcsIDApJzsgfSxcbiAgICAgICAgICAgICdjbGFzcyc6ICdiYXInXG4gICAgICAgIH0pO1xuXG4gICAgYmFyLmFwcGVuZCgnY2lyY2xlJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ2NsYXNzJzogJ2NpcmNsZV9zdHJva2UnLFxuICAgICAgICAgICAgJ3InOiA2LFxuICAgICAgICAgICAgJ2N4JzogYmFyV2lkdGggLyAyLFxuICAgICAgICAgICAgJ2N5JzogZnVuY3Rpb24gKGQpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHkoZC52YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIGJhci5hcHBlbmQoJ2NpcmNsZScpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICdjbGFzcyc6ICdjaXJjbGUnLFxuICAgICAgICAgICAgJ3InOiA0LFxuICAgICAgICAgICAgJ2N4JzogYmFyV2lkdGggLyAyLFxuICAgICAgICAgICAgJ2N5JzogZnVuY3Rpb24gKGQpe1xuICAgICAgICAgICAgICAgIHJldHVybiBNYXRoLnJvdW5kKHkoZC52YWx1ZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIHRoaXMuX2RyYXdUaW1lbGluZShiYXIpO1xufVxuXG5DaGFydC5wcm90b3R5cGUuX2RyYXdUaW1lbGluZSA9IGZ1bmN0aW9uIChiYXIpe1xuICAgIHZhciBsaW5lSGVpZ2h0ID0gNTtcbiAgICAvLyBkYXlzXG4gICAgYmFyLmFwcGVuZCgndGV4dCcpXG4gICAgICAgIC5hdHRyKHtcbiAgICAgICAgICAgICd4JzogYmFyV2lkdGggLyAyLFxuICAgICAgICAgICAgJ3knOiBoZWlnaHQgKyAxNSxcbiAgICAgICAgICAgICdjbGFzcyc6IGZ1bmN0aW9uIChkKXtcbiAgICAgICAgICAgICAgICB2YXIgZGF5ID0gZC5rZXkuZ2V0RGF5KCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChkYXkgPT09IDAgfHwgZGF5ID09PSA2KSAmJiBjb25maWcuc2hvd1dlZWtkYXlzID8gJ2RhdGUgaG9saWRheSc6ICdkYXRlJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLnRleHQoIGZ1bmN0aW9uKGQpe1xuICAgICAgICAgICAgcmV0dXJuIGQua2V5LmdldERhdGUoKTtcbiAgICAgICAgfSk7XG5cbiAgICAvLyB3ZWVrZGF5c1xuICAgIGlmICggY29uZmlnLnNob3dXZWVrZGF5cyApIHtcbiAgICAgICAgYmFyLmFwcGVuZCgndGV4dCcpXG4gICAgICAgICAgICAuYXR0cih7XG4gICAgICAgICAgICAgICAgJ3gnOiBiYXJXaWR0aCAvIDIsXG4gICAgICAgICAgICAgICAgJ3knOiBoZWlnaHQgKyAzMCxcbiAgICAgICAgICAgICAgICAnY2xhc3MnOiBmdW5jdGlvbiAoZCl7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkYXkgPSBkLmtleS5nZXREYXkoKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRheSA9PT0gMCB8fCBkYXkgPT09IDYgPyAnd2Vla2RheSBob2xpZGF5JzogJ3dlZWtkYXknO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAudGV4dCggZnVuY3Rpb24oZCl7XG4gICAgICAgICAgICAgICAgdmFyIGRheSA9IGQua2V5LmdldERheSgpO1xuICAgICAgICAgICAgICAgIHJldHVybiB3ZWVrZGF5c1tkYXldO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgbGluZUhlaWdodCA9IDMwO1xuICAgIH1cblxuICAgIC8vIGRpdmlkZXJcbiAgICBiYXIuYXBwZW5kKCdsaW5lJylcbiAgICAgICAgLmF0dHIoe1xuICAgICAgICAgICAgJ3gxJzogYmFyV2lkdGgsXG4gICAgICAgICAgICAneTEnOiBoZWlnaHQsXG4gICAgICAgICAgICAneDInOiBiYXJXaWR0aCxcbiAgICAgICAgICAgICd5Mic6IGhlaWdodCArIGxpbmVIZWlnaHQsXG4gICAgICAgICAgICAnY2xhc3MnOiAndGltZWxpbmUnXG4gICAgICAgIH0pO1xufVxuXG5DaGFydC5wcm90b3R5cGUuY2hhbmdlVmlkZW8gPSBmdW5jdGlvbiAodmFsdWUpe1xuICAgIGNvbmZpZy52aWRlbyA9IHZhbHVlO1xuICAgIHZhciBjaGFydERhdGEgPSB0aGlzLmdldENoYXJ0RGF0YSgpO1xuXG4gICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcbn07XG5cbkNoYXJ0LnByb3RvdHlwZS5jaGFuZ2VBY3Rpdml0eSA9IGZ1bmN0aW9uICh2YWx1ZSl7XG4gICAgY29uZmlnLmFjdGl2aXR5ID0gdmFsdWU7XG4gICAgdmFyIGNoYXJ0RGF0YSA9IHRoaXMuZ2V0Q2hhcnREYXRhKCk7XG5cbiAgICB0aGlzLnJlbmRlcihjaGFydERhdGEpO1xufTtcblxuQ2hhcnQucHJvdG90eXBlLmNoYW5nZVBlcmlvZCA9IGZ1bmN0aW9uICh2YWx1ZSl7XG4gICAgY29uZmlnLnBlcmlvZCA9IHZhbHVlO1xuICAgIHZhciBjaGFydERhdGEgPSB0aGlzLmdldENoYXJ0RGF0YSgpO1xuXG4gICAgdGhpcy5yZW5kZXIoY2hhcnREYXRhKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ2hhcnQ7XG4iLCJ2YXIgQ2hhcnQgPSByZXF1aXJlKCcuL2NoYXJ0JyksXG4gICAgY2hhcnQgPSBuZXcgQ2hhcnQoKSxcbiAgICB2aWRlb1NlbGVjdCA9IGQzLnNlbGVjdCgnI3ZpZGVvX3NlbGVjdCcpLFxuICAgIHN3aXRjaGVycyA9IGQzLnNlbGVjdEFsbCgnLnN3aXRjaGVyJyk7XG5cbmZ1bmN0aW9uIENvbnRyb2xsZXIgKCl7XG4gICAgLy8gbWFrZSB0aGlzIGNsYXNzIGEgc2luZ2xldG9uXG4gICAgaWYgKCBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZSApIHtcbiAgICAgICAgcmV0dXJuIGFyZ3VtZW50cy5jYWxsZWUuX3NpbmdsZXRvbkluc3RhbmNlO1xuICAgIH1cbiAgICBhcmd1bWVudHMuY2FsbGVlLl9zaW5nbGV0b25JbnN0YW5jZSA9IHRoaXM7XG59XG5cbkNvbnRyb2xsZXIucHJvdG90eXBlLmluaXQgPSBmdW5jdGlvbiAoZGF0YSl7XG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIHRoaXMuZGF0YSA9IGRhdGE7XG5cbiAgICB0aGlzLnZpZGVvU2VsZWN0ID0gdmlkZW9TZWxlY3Q7XG5cbiAgICB0aGlzLl9maWxsVmlkZW9TZWxlY3QoKTtcbiAgICAvLyBhdHRhY2ggZXZlbnRzXG4gICAgc3dpdGNoZXJzLnNlbGVjdEFsbCgnc3BhbicpLm9uKCdjbGljaycsIGZ1bmN0aW9uIChlKXtcbiAgICAgICAgdmFyIHRhcmdldCA9IGQzLnNlbGVjdCh0aGlzKSxcbiAgICAgICAgICAgIHBhcmVudCA9IGQzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUpLFxuICAgICAgICAgICAgYWN0aW9uID0gdGhpcy5wYXJlbnROb2RlLmRhdGFzZXQuYWN0aW9uLFxuICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmRhdGFzZXQudmFsdWU7XG5cbiAgICAgICAgcGFyZW50LnNlbGVjdEFsbCgnc3BhbicpLmNsYXNzZWQoJ2FjdGl2ZScsIGZhbHNlKTtcbiAgICAgICAgdGFyZ2V0LmNsYXNzZWQoJ2FjdGl2ZScsIHRydWUpO1xuXG4gICAgICAgIHNlbGZbYWN0aW9uXSh2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICB2aWRlb1NlbGVjdC5vbignY2hhbmdlJywgZnVuY3Rpb24gKGUpe1xuICAgICAgICB2YXIgdmlkZW9JbmRleCA9ICt0aGlzLnZhbHVlO1xuXG4gICAgICAgIGNoYXJ0LmNoYW5nZVZpZGVvKHZpZGVvSW5kZXgpO1xuICAgIH0pO1xufTtcblxuQ29udHJvbGxlci5wcm90b3R5cGUuX2ZpbGxWaWRlb1NlbGVjdCA9IGZ1bmN0aW9uICgpe1xuICAgIHZhciB2aWRlb05hbWVzID0gdGhpcy5kYXRhLm1hcChmdW5jdGlvbiAoaXRlbSwgaSl7IHJldHVybiBpdGVtLm5hbWU7IH0pLFxuICAgICAgICB2aWRlb1VwZGF0ZSA9IHZpZGVvU2VsZWN0LnNlbGVjdEFsbCgnb3B0aW9ucycpLmRhdGEodmlkZW9OYW1lcyk7XG5cbiAgICB2aWRlb1VwZGF0ZVxuICAgIC5lbnRlcigpXG4gICAgLmFwcGVuZCgnb3B0aW9uJylcbiAgICAudGV4dChmdW5jdGlvbiAoZCl7XG4gICAgICAgIHJldHVybiBkO1xuICAgIH0pXG4gICAgLmF0dHIoJ3ZhbHVlJywgZnVuY3Rpb24gKGQpe1xuICAgICAgICByZXR1cm4gdmlkZW9OYW1lcy5pbmRleE9mKGQpO1xuICAgIH0pO1xufTtcblxuQ29udHJvbGxlci5wcm90b3R5cGUuc3dpdGNoQWN0aXZpdHkgPSBmdW5jdGlvbiAodmFsdWUpe1xuICAgIGNoYXJ0LmNoYW5nZUFjdGl2aXR5KHZhbHVlKTtcbn07XG5cbkNvbnRyb2xsZXIucHJvdG90eXBlLnN3aXRjaFBlcmlvZCA9IGZ1bmN0aW9uICh2YWx1ZSl7XG4gICAgY2hhcnQuY2hhbmdlUGVyaW9kKHZhbHVlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gQ29udHJvbGxlcjsiXX0=
