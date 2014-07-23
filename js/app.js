;(function (d3, w, d){

    var height = 300,
        barWidth = 40,
        main = d3.select('#main'),
        graph = d3.select('#graph'),
        scale = d3.select('#scale').append('svg').attr({ 'height': height + 20, 'width': 50 }),
        videoSelect = d3.select('#video_select'),
        svg = graph.append('svg').attr('height', height + 20),
        months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


    // retrieve data
    d3.json('./data.json', init);

    function getMaxInt (value){
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

    function buildGraph (dataHash, daily){
        // get an array of key-value objects
        var data = d3.map(dataHash).entries(),
            monthsData = [];

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

        if (daily ) {
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

        // fill months data
        data.forEach((function (){
            var currentMonth = '';
            return function (item, i){
                // use d3.time.format("%b %Y").parse;
                var month = months[item.key.getMonth()] + ' ' + item.key.getFullYear();

                if ( month !== currentMonth ) {
                    monthsData.push({
                        text: month,
                        margin: i * barWidth
                    });

                    console.log(i * barWidth);

                    currentMonth = month;
                }
            }
        })());

        var max = d3.max(data, function (item){
                return item.value;
            }),
            y = d3.scale.linear().domain([0, getMaxInt(max)]).range([height, 0]),
            scaleData = y.ticks(4).map(y.tickFormat(4, "d")),
            graphWidth = data.length * barWidth;

        // set the canvas width
        svg.attr('width', graphWidth);

        // clear canvas
        svg.selectAll('*').remove();

        svg.append('line')
            .attr({
                'x1': 0,
                'y1': height,
                'x2': graphWidth,
                'y2': height,
                'class': 'timeline'
            });

        // draw month ticks
        var monthTick = svg.selectAll('g.month_tick')
            .data(monthsData)
            .enter()
            .append('g')
            .attr({
                'transform': function(d, i) { console.log(d.margin); return 'translate(' + d.margin + ', 0)'; },
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

        if ( daily ){
            drawDailyBars(data, y);
        } else {
            drawGrossBars(data, y);
        }
    }

    function drawDailyBars (data, y) {
        var bar = svg.selectAll('g.bar')
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

        drawTimeline(bar);
    }

    function drawGrossBars (data, y){
        var area = d3.svg.area()
            .interpolate('monotone')
            .x(function(d, i) { return i * barWidth + (barWidth / 2); })
            .y0(height)
            .y1(function(d, i) { return y(d.value); });

        svg.append('path')
            .datum(data)
            .attr({
                'class': 'area',
                'd': area
            });


        var line = d3.svg.line()
            .x(function(d, i) { return i * barWidth + (barWidth / 2); })
            .y(function(d, i) { return y(d.value); })
            .interpolate('linear');

        svg.append('path')
            .datum(data)
            .attr({
                'class': 'curve',
                'd': line
            });

        var bar = svg.selectAll('g.bar')
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

        drawTimeline(bar);

    }

    function drawTimeline (bar){
        // days
        bar.append('text')
            .attr({
                'x': barWidth / 2,
                'y': height + 15,
                'class': 'date'
            })
            .text( function(d){
                return d.key.getDate();
            });

        bar.append('line')
            .attr({
                'x1': barWidth,
                'y1': height,
                'x2': barWidth,
                'y2': height + 5,
                'class': 'timeline'
            });
    }


    function init (err, data){
        var videoNames = data.map(function (item, i){ return item.name; }),
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

        videoSelect.on('change', function (e){
            var videoIndex = +this.value;

            buildGraph(data[videoIndex].views, true);
        });

        buildGraph(data[0].views);

    }


})(d3, window, document);