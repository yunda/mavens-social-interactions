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