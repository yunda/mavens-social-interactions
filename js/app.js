;(function (d3, w, d){

    var data = d3.json('./data.json', init),
        main = d3.select('#main'),
        graph = d3.select('#graph'),
        videoSelect = d3.select('#video_select'),
        svg = graph.append('svg')
        .attr('height', 300);


    function init (err, data){

        var videoNames = data.map(function (item, i){
                return item.name;
            }),
            videoUpdate = videoSelect.selectAll('options').data(videoNames);


        videoUpdate.enter().append('option').text(function (d){
                return d;
            });


        console.dir(data);

    }

})(d3, window, document);