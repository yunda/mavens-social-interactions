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
