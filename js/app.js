var Chart = require('./chart'),
    PillsBar = require('./pills-bar'),
    Contoller = require('./controller');

// retrieve data
d3.json('./data.json', init);

function init (err, data){
    var contoller = new Contoller(),
        chart = new Chart(),
        pillsBar = new PillsBar();

    contoller.init(data);
    chart.init(data);
    pillsBar.init(data);
}