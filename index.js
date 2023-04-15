var events = [
    {"id": "rift", "q":  "now!B3:M13", "row":  1, "c": 26},
    {"id": "char", "q": "now!B14:M24", "row": 12, "c": 26},
    {"id": "elem", "q": "now!B25:E35", "row": 23, "c": 26},
    {"id": "medi", "q": "now!B36:D46", "row": 34, "c": 26},
    {"id": "smym", "q": "now!B47:E57", "row": 45, "c": 26},
    {"id": "holi", "q": "now!B58:G68", "row": 56, "c": 26}
];
var data, options;

google.charts.load("current", {"packages": ["corechart"]});
google.charts.setOnLoadCallback(checkNow);

function sendQuery(q, f) {
    var sheetID = "1hpmUc__uYo0-tq10tampy7CDIfALn6N5_sMELTBlTOs";
    var range = encodeURIComponent(q);
    var query = new google.visualization.Query(
        "https://docs.google.com/spreadsheets/d/" +
        sheetID +
        "/gviz/tq?range=" +
        range
    );
    query.send(function (response) {
        if (response.isError()) {
            console.error(
                "Error in query:",
                response.getMessage(),
                response.getDetailedMessage()
            );
        }
        else {
            var data = response.getDataTable();
            f(data);
            console.log(data);
        }
    });
}

function redraw() {
    var element = document.getElementById("chart");
    var chart = new google.visualization.LineChart(element);
    chart.draw(data, options);
}

function drawChartRift() {
    sendQuery("now!B3:T13", function (d) { // todo: should be B3:U13
    // sendQuery("now!B14:Z24", function (data) {
        data = d;
        options = {
            title: "Rift",
            backgroundColor: "transparent",
            hAxis: {title: 'Date'},
            vAxis: {title: 'Score', viewWindow: {min: 900}}
        };
        redraw();
    });
}

function setEvent(id, title, content, active) {
    var box = document.getElementById(id);

    var boxTitle = document.createElement("div");
    boxTitle.innerHTML = title;
    box.appendChild(boxTitle);

    var boxContent = document.createElement("div");
    if (id == "rift" || id == "elem") {
        var img = new Image();
        img.src = "https://krazete.github.io/sgm/image/official/ElementalIcon" + content + ".png";
        boxContent.appendChild(img);
    }
    else if (id == "char") {
        var img = new Image();
        img.src = "https://krazete.github.io/sgm/image/official/" + content.replace(/-F/, "f").replace(/\s|\./g, "") + "_MasteryIcon.png";
        boxContent.appendChild(img);
    }
    boxContent.innerHTML += content;
    box.appendChild(boxContent);

    if (active) {
        box.classList.add("active");
    }
    else {
        box.classList.remove("active");
    }
}

function checkNow() {
    sendQuery("now!A:D", function (data) {
        setEvent(
            "dail",
            data.getColumnLabel(0),
            [1, 2, 3].map(i => data.getColumnLabel(i)).filter(e => e).join(", "),
            true
        )
        for (var event of events) {
            setEvent(
                event.id,
                data.getValue(event.row, 0),
                data.getValue(event.row + 1, 0),
                data.getValue(event.row + 2, 0) > 0
            );
        }
    });
    drawChartRift();
}

window.addEventListener("resize", redraw);
