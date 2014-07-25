var brandsElem = d3.select('#brands'),
    brandsHolder = d3.select('#brands_holder');

function PillsBar (){
    // make this class a singleton
    if ( arguments.callee._singletonInstance ) {
        return arguments.callee._singletonInstance;
    }
    arguments.callee._singletonInstance = this;
}

PillsBar.prototype.init = function (data){
    this.data = data;

    this.brandsData = this.data[0].brands;

    this.brandsHolder = brandsHolder;

    this.render(this.brandsData);
};

PillsBar.prototype.render = function (brandsData){
    brandsHolder.selectAll('*').remove();

    if ( brandsData.length === 0 ) {
        brandsElem.classed('hidden', true);
        return;
    } else {
        brandsElem.classed('hidden', false);
    }

    var brandsUpdate = brandsHolder.selectAll('.brand_pill').data(brandsData);

    brandsUpdate.enter()
        .append('span')
        .attr('class', 'brand_pill')
        .text(function (d){
            return d;
        });
};

PillsBar.prototype.changeVideo = function (videoIndex){
    this.brandsData = this.data[videoIndex].brands;

    this.render(this.brandsData);
}

module.exports = PillsBar;