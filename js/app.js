;(function (d3, w, d){

    var height = 300,
        barWidth = 30,
        main = d3.select('#main'),
        graph = d3.select('#graph'),
        videoSelect = d3.select('#video_select'),
        svg = graph.append('svg').attr('height', height + 20),
        months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


    // retrieve data
    d3.json('./data.json', init);

    function buildGraph (dataHash){
        // get an array of key-value objects
        var data = d3.map(dataHash).entries(),
            max = d3.max(data, function (item){
                return item.value;
            }),
            y = d3.scale.linear().domain([0, max]).range([height, 0]),

        // sort data by date
        data = data.sort(function (a, b){
            var aTime = (new Date(a.key)).getTime(),
                bTime = (new Date(b.key)).getTime();
            return aTime - bTime;
        });

        // set the canvas width
        svg.attr('width', data.length * barWidth);

        svg.selectAll('g').remove();

        var bar = svg.selectAll('g')
            .data(data)
            .enter()
            .append('g')
            .attr('transform', function(d, i) { return 'translate(' + i * barWidth + ', 0)'; });

        bar.append('line')
            .attr({
                'stroke': '#39ba82',
                'stroke-width': '3'
            })
            .attr({
                'x1': 0,
                'y1': function (d){
                    return Math.round(y(d.value));
                },
                'x2': barWidth,
                'y2': function (d){
                    return Math.round(y(d.value));
                }
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

            buildGraph(data[videoIndex].views);
        });

        buildGraph(data[0].views);

    }


})(d3, window, document);