const updatePreview = () => {
    createPdf();
}

const cmyk = PDFLib.cmyk
const PageSizes = PDFLib.PageSizes

const defaultOptions = {
    topTitle: "SP-Stimmzettel / SP Ballot",
    title: "Wahl zum 44. Studierendenparlament der RFWU Bonn — 20. Januar 2022",
    titleEN: "Election of the 44th Student Parliament of the University of Bonn — 20th January 2022",
    outerPadding: 5,
    itemHeight: 6.5,
    columnPadding: 3,
    listRowPadding: 8,
    columns: 5,
    dashedLineWidth: 2,
    circleRadius: 2,
    circleWidth: 0.25,
    numberSize: 8,
    nameSize: 7,
    subjectSize: 6,
};
class GlobalConfig {
    constructor(regularFont, italicFont, boldFont, options, azb) {
        this.options = options;
        this.pageSize = PageSizes.A3;
        this.outerPadding = mm(options.outerPadding);
        this.headerHeight = mm(18);
        this.itemHeight = mm(options.itemHeight);
        this.columnPadding = mm(options.columnPadding);
        this.listRowPadding = mm(options.listRowPadding);
        this.columns = options.columns;
        this.regularFont = regularFont;
        this.italicFont = italicFont;
        this.boldFont = boldFont;
        this.dottedLineWidth = 0.25;
        this.dashedLineWidth = mm(options.dashedLineWidth);
        this.azb = azb;
        if (this.azb) {
            this.headerHeight = mm(60);
            this.dashedLineWidth = 1;
        }
    }
    get listSpaceHeight() {
        return this.pageSize[1] - 2 * this.outerPadding - this.headerHeight;
    }
}
class ItemConfig {
    constructor(globalConfig) {
        this.globalConfig = globalConfig;
        this.height = globalConfig.itemHeight;
        this.width = (globalConfig.pageSize[0] - (2 * this.globalConfig.outerPadding) - ((this.globalConfig.columns - 1) * this.globalConfig.columnPadding)) / this.globalConfig.columns;
        this.circleRadius = mm(globalConfig.options.circleRadius);
        this.circleWidth = mm(globalConfig.options.circleWidth);
        this.circleSpaceWidth = this.circleRadius * 2 + mm(0.25);
        this.numberSpaceWidth = mm(4);
        this.numberSize = globalConfig.options.numberSize;
        this.numberFont = globalConfig.regularFont;
        this.nameSize = globalConfig.options.nameSize;
        this.nameY = 3.5 / 6.5 * this.height;
        this.nameFont = globalConfig.regularFont;
        this.subjectSize = globalConfig.options.subjectSize;
        this.subjectY = 1 / 6.5 * this.height;
        this.subjectFont = globalConfig.italicFont;
        if (globalConfig.azb) {
            this.circleSpaceWidth = mm(15);
        }
    }
    get nameSpaceWidth() {
        return this.width - this.circleSpaceWidth - this.numberSpaceWidth;
    }
}
class Data {
    constructor(lists) {
        this.lists = lists;
    }
    static fromJson(obj) {
        return new Data(obj.map(l => List.fromJson(l)));
    }
    getListsHeight(c) {
        let sum = 0;
        for (let list of this.lists) {
            sum += list.getHeight(c);
        }
        return sum;
    }
}
class Person {
    constructor(number, name, subjects) {
        this.number = number;
        this.name = name;
        this.subjects = subjects;
    }
    static fromJson(obj) {
        return new Person(obj.number, obj.name, obj.subjects);
    }
}
class List {
    constructor(listname, people) {
        this.listname = listname;
        this.people = people;
    }
    static fromJson(obj) {
        return new List(obj.listname, obj.people.map(p => Person.fromJson(p)));
    }
    getRowsPerColumn(c) {
        return Math.ceil((this.people.length + 1) / c.columns);
    }
    getHeight(c) {
        let rowsPerColumn = this.getRowsPerColumn(c);
        if (c.azb && (((this.people.length + 1) % c.columns) == 0)) {
            rowsPerColumn++;
        }
        return c.itemHeight * rowsPerColumn;
    }
}
const mm = (value) => {
    return value * 72 / 25.4;
};
const drawPerson = (page, person, x, y, c, topLine = false, debug = true) => {
    if (debug) {
        page.drawRectangle({
            x: x,
            y: y,
            width: c.width,
            height: c.height,
            color: cmyk(0, 1, 0, 0),
            opacity: 0.5,
        });
    }
    let start_x = x + (c.circleWidth / 2);
    if (debug) {
        page.drawRectangle({
            x: x,
            y: y,
            width: c.circleSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.3, 0),
            opacity: 0.5,
        });
    }
    if (c.globalConfig.azb) {
        page.drawRectangle({
            x: start_x,
            y: y,
            width: c.circleSpaceWidth,
            height: c.height,
            borderColor: cmyk(0, 0, 0, 1),
            borderWidth: 1,
        });
    }
    else {
        page.drawCircle({
            x: start_x + c.circleRadius,
            y: y + (c.height / 2),
            size: c.circleRadius,
            borderColor: cmyk(0, 0, 0, 1),
            borderWidth: c.circleWidth,
        });
    }
    start_x = x + c.circleSpaceWidth;
    const referenceHeight = c.numberFont.heightAtSize(c.numberSize, { descender: false });
    if (debug) {
        page.drawRectangle({
            x: start_x,
            y: y,
            width: c.numberSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.6, 0),
            opacity: 0.5,
        });
    }
    drawCentredText(page, person.number, start_x, y + (c.height - referenceHeight) / 2, c.numberSpaceWidth, c.numberSize, c.numberFont, debug);
    start_x += c.numberSpaceWidth;
    if (debug) {
        page.drawRectangle({
            x: start_x,
            y: y,
            width: c.nameSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.9, 0),
            opacity: 0.5,
        });
    }
    const textWidth = c.nameFont.widthOfTextAtSize(person.name, c.nameSize);
    const textHeight = c.nameFont.heightAtSize(c.nameSize, { descender: false });
    let nameScale = 1;
    if (textWidth > c.nameSpaceWidth) {
        nameScale = c.nameSpaceWidth / textWidth;
        if (debug) {
            page.drawRectangle({
                x: start_x,
                y: y + c.nameY,
                width: textWidth,
                height: textHeight,
                color: cmyk(0, 1, 1, 0),
                opacity: 0.5,
            });
        }
    }
    page.drawText(person.name, {
        x: start_x,
        y: y + c.nameY,
        size: c.nameSize,
        font: c.nameFont,
        color: cmyk(0, 0, 0, 1),
        matrix: [nameScale, 0, 0, 1, 0, 0],
    });
    const subjectsWidth = c.subjectFont.widthOfTextAtSize(person.subjects, c.subjectSize);
    const subjectsHeight = c.subjectFont.heightAtSize(c.subjectSize, { descender: false });
    let subjectsScale = 1;
    if (subjectsWidth > c.nameSpaceWidth) {
        subjectsScale = c.nameSpaceWidth / subjectsWidth;
        if (debug) {
            page.drawRectangle({
                x: start_x,
                y: y + c.subjectY,
                width: subjectsWidth,
                height: subjectsHeight,
                color: cmyk(0, 1, 1, 0),
                opacity: 0.5,
            });
        }
    }
    page.drawText(person.subjects, {
        x: start_x,
        y: y + c.subjectY,
        size: c.subjectSize,
        font: c.subjectFont,
        color: cmyk(0, 0, 0, 0.7),
        matrix: [subjectsScale, 0, 0, 1, 0, 0],
    });
    drawSmallDottedLine(page, x, y, c.width, c.globalConfig);
    if (topLine) {
        drawSmallDottedLine(page, x, y + c.height, c.width, c.globalConfig);
    }
};
const drawListField = (page, list, x, y, c, debug = true) => {
    if (debug) {
        page.drawRectangle({
            x: x,
            y: y,
            width: c.width,
            height: c.height,
            color: cmyk(0, 1, 0, 0),
            opacity: 0.5,
        });
    }
    let start_x = x + (c.circleWidth / 2);
    if (debug) {
        page.drawRectangle({
            x: x,
            y: y,
            width: c.circleSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.3, 0),
            opacity: 0.5,
        });
    }
    if (c.globalConfig.azb) {
        page.drawRectangle({
            x: start_x,
            y: y,
            width: c.circleSpaceWidth,
            height: c.height,
            borderColor: cmyk(0, 0, 0, 1),
            borderWidth: 1,
        });
        start_x = x + c.circleSpaceWidth;
        const referenceHeight = c.numberFont.heightAtSize(c.numberSize, { descender: false });
        if (debug) {
            page.drawRectangle({
                x: start_x,
                y: y,
                width: c.numberSpaceWidth,
                height: c.height,
                color: cmyk(0, 0, 0.6, 0),
                opacity: 0.5,
            });
        }
        drawCentredText(page, 'L', start_x, y + (c.height - referenceHeight) / 2, c.numberSpaceWidth, c.numberSize, c.numberFont, debug);
        start_x += c.numberSpaceWidth;
    }
    else {
        page.drawCircle({
            x: start_x + c.circleRadius,
            y: y + (c.height / 2),
            size: c.circleRadius,
            borderColor: cmyk(0, 0, 0, 1),
            borderWidth: c.circleWidth,
        });
        start_x = x + c.circleSpaceWidth + c.numberSpaceWidth;
    }
    if (debug) {
        page.drawRectangle({
            x: start_x,
            y: y,
            width: c.nameSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.9, 0),
            opacity: 0.5,
        });
    }
    page.drawRectangle({
        x: start_x,
        y: y,
        width: c.nameSpaceWidth,
        height: c.height,
        color: cmyk(0, 0, 0, 0.3),
        opacity: 1,
    });
    const height = c.nameFont.heightAtSize(c.nameSize, { descender: false });
    if (list.listname.length == 1) {
        drawCentredText(page, list.listname[0], start_x, y + (c.height - height) / 2, c.nameSpaceWidth, c.nameSize, c.nameFont, debug);
    }
    else {
        let topLineY = y + (c.height - 2 * height) / 5 * 3 + height;
        let bottomLineY = y + (c.height - height) / 5;
        drawCentredText(page, list.listname[0], start_x, topLineY, c.nameSpaceWidth, c.nameSize, c.nameFont, debug);
        drawCentredText(page, list.listname[1], start_x, bottomLineY, c.nameSpaceWidth, c.nameSize, c.nameFont, debug);
    }
    drawSmallDottedLine(page, x, y, c.width, c.globalConfig);
    drawSmallDottedLine(page, x, y + c.height, c.width, c.globalConfig);
};
const drawCentredText = (page, text, x, y, width, size, font, debug = true, color = cmyk(0, 0, 0, 1)) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    let start_x = x + (width - textWidth) / 2;
    if (debug) {
        const textHeight = font.heightAtSize(size, { descender: false });
        page.drawRectangle({
            x: start_x,
            y: y,
            width: textWidth,
            height: textHeight,
            color: cmyk(1, 1, 0, 0),
            opacity: 0.2,
        });
    }
    let nameScale = 1;
    if (textWidth > width) {
        nameScale = width / textWidth;
        start_x = x;
        if (debug) {
            const textHeight = font.heightAtSize(size, { descender: false });
            page.drawRectangle({
                x: start_x,
                y: y,
                width: textWidth,
                height: textHeight,
                color: cmyk(0, 1, 1, 0),
                opacity: 0.5,
            });
        }
    }
    page.drawText(text, {
        x: start_x,
        y: y,
        size: size,
        font: font,
        color: color,
        matrix: [nameScale, 0, 0, 1, 0, 0],
    });
};
const drawSmallDottedLine = (page, x, y, width, c) => {
    page.drawLine({
        start: { x: x, y: y },
        end: { x: x + width, y: y },
        thickness: c.dottedLineWidth,
        color: cmyk(0, 0, 0, 0.5),
        dashArray: [0, 0.5],
        dashPhase: c.dottedLineWidth / 4,
        lineCap: 1,
    });
};
const drawList = (page, list, y, c, debug = true) => {
    const listItemConfig = new ItemConfig(c);
    listItemConfig.nameFont = c.boldFont;
    drawListField(page, list, c.outerPadding, y, listItemConfig, debug);
    let index = 1;
    const rowsPerColumn = list.getRowsPerColumn(c);
    for (let person of list.people) {
        const column = Math.floor(index / rowsPerColumn);
        const row = index % rowsPerColumn;
        const itemConfig = new ItemConfig(c);
        const x = c.outerPadding + column * itemConfig.width + column * c.columnPadding;
        const pos_y = y - row * c.itemHeight;
        drawPerson(page, person, x, pos_y, itemConfig, row == 0, debug);
        index++;
    }
    if (c.azb) {
        let column = Math.floor(index / rowsPerColumn);
        let row = index % rowsPerColumn;
        if (column > (c.columns - 1)) {
            column = c.columns - 1;
            row = rowsPerColumn;
        }
        const itemConfig = new ItemConfig(c);
        itemConfig.nameFont = c.boldFont;
        const x = c.outerPadding + column * itemConfig.width + column * c.columnPadding;
        const pos_y = y - row * c.itemHeight;
        const person = new Person('G', 'Gesamtstimmen', list.listname.join(' '));
        drawPerson(page, person, x, pos_y, itemConfig, row == 0, debug);
    }
};
const drawLists = (page, data, c, debug = true) => {
    let current_y = page.getHeight() - c.outerPadding - c.headerHeight - c.dashedLineWidth / 2;
    drawDashedLine(page, current_y, c);
    current_y -= (0.5 * c.listRowPadding + c.itemHeight);
    for (let list of data.lists) {
        const listtodraw = List.fromJson(list);
        drawList(page, listtodraw, current_y, c, debug);
        if (c.azb) {
            current_y = current_y - list.getHeight(c) - c.listRowPadding;
        }
        else {
            const rowsPerColumn = list.getRowsPerColumn(c);
            current_y = current_y - rowsPerColumn * c.itemHeight - c.listRowPadding;
        }
        const line_y = current_y + c.itemHeight + 0.5 * c.listRowPadding;
        drawDashedLine(page, line_y, c);
    }
};
const drawDashedLine = (page, y, c) => {
    const dashLength = (page.getWidth() - c.outerPadding * 2) / 61;
    page.drawLine({
        start: { x: c.outerPadding, y: y },
        end: { x: page.getWidth() - c.outerPadding, y: y },
        thickness: c.dashedLineWidth,
        color: cmyk(0, 0, 0, 0.2),
        dashArray: [dashLength, dashLength],
        dashPhase: 0,
    });
};
function drawX(page, start_x, start_y, c) {
    page.drawLine({
        start: { x: start_x, y: start_y + 2 },
        end: { x: start_x + c.itemHeight - 5, y: start_y + c.itemHeight - 2 },
        thickness: 2,
        color: cmyk(0, 0, 0, 1),
        lineCap: 1,
    });
    page.drawLine({
        start: { x: start_x + 1, y: start_y + c.itemHeight - 2 },
        end: { x: start_x + c.itemHeight - 5, y: start_y + 2 },
        thickness: 2,
        color: cmyk(0, 0, 0, 1),
        lineCap: 1,
    });
}
const drawAltHeader = (page, c, debug = true) => {
    const { width, height } = page.getSize();
    let x, y, w;
    x = c.outerPadding;
    y = height - c.outerPadding - mm(33);
    w = mm(55);
    page.drawRectangle({
        x: x,
        y: y,
        width: w,
        height: mm(33),
        borderColor: cmyk(0, 0, 0, 1),
        borderWidth: 2,
    });
    drawCentredText(page, 'Urne Nr.', x, y + mm(1), w, 8, c.regularFont, debug);
    x += w + c.columnPadding;
    w = mm(112);
    page.drawRectangle({
        x: x,
        y: y,
        width: w,
        height: mm(33),
        borderColor: cmyk(0, 0, 0, .5),
        borderWidth: 2,
    });
    drawCentredText(page, 'Kommentare + anders interpretierte Stimmzettel', x, y + mm(1), w, 8, c.regularFont, debug);
    x = c.outerPadding;
    y -= mm(18);
    w = mm(35);
    page.drawRectangle({
        x: x,
        y: y,
        width: w,
        height: mm(15),
        borderColor: cmyk(0, 0, 0, 1),
        borderWidth: 2,
    });
    drawCentredText(page, 'Nr. auf Laufzettel', x, y + mm(1), w, 8, c.regularFont, debug);
    x += w + c.columnPadding;
    page.drawRectangle({
        x: x,
        y: y,
        width: w,
        height: mm(15),
        borderColor: cmyk(0, 0, 0, .5),
        borderWidth: 2,
    });
    drawCentredText(page, 'Team', x, y + mm(1), w, 8, c.regularFont, debug);
    x += w + c.columnPadding;
    w = mm(94);
    page.drawRectangle({
        x: x,
        y: y,
        width: w,
        height: mm(15),
        borderColor: cmyk(0, 0, 0, .5),
        borderWidth: 2,
    });
    drawCentredText(page, 'Unterschrift Tischleitung', x, y + mm(1), w, 8, c.regularFont, debug);
    x += w + c.columnPadding;
    w = mm(55);
    drawCentredText(page, 'Gültige Stimmen', x, y + mm(3), w, 20, c.regularFont, debug);
    page.drawRectangle({
        x: x + w,
        y: y,
        width: w,
        height: mm(10),
        borderColor: cmyk(0, 0, 0, 1),
        borderWidth: 2,
    });
    y += mm(13);
    drawCentredText(page, 'Ungültige Stimmen', x, y + mm(3), w, 20, c.regularFont, debug);
    page.drawRectangle({
        x: x + w,
        y: y,
        width: w,
        height: mm(10),
        borderColor: cmyk(0, 0, 0, 1),
        borderWidth: 2,
    });
    y += mm(13);
    drawCentredText(page, 'Stimmen Gesamt', x, y + mm(3), w, 20, c.boldFont, debug);
    page.drawRectangle({
        x: x + w,
        y: y,
        width: w,
        height: mm(10),
        borderColor: cmyk(0, 0, 0, 1),
        borderWidth: 2,
    });
    y += mm(13);
    drawCentredText(page, 'Vorab ungültig, weil', x, y + mm(6), w, 8, c.regularFont, debug);
    drawCentredText(page, 'Briefwahlvorgaben nicht eingehalten', x, y + mm(3), w, 8, c.regularFont, debug);
    page.drawRectangle({
        x: x + w,
        y: y,
        width: w,
        height: mm(10),
        borderColor: cmyk(0, 0, 0, 1),
        borderWidth: 2,
    });
};
const drawHeader = (page, c, debug = true) => {
    const { width, height } = page.getSize();
    if (debug) {
        page.drawRectangle({
            x: c.outerPadding,
            y: height - c.outerPadding - c.headerHeight,
            width: width - 2 * c.outerPadding,
            height: c.headerHeight,
            color: cmyk(0, 1, 1, 0),
            opacity: 0.3,
        });
    }
    const circleRadius = mm(7);
    page.drawCircle({
        x: c.outerPadding + circleRadius,
        y: height - c.outerPadding - circleRadius,
        size: circleRadius,
        color: cmyk(0, 0, 0, 0.9),
    });
    drawCentredText(page, "?", c.outerPadding, height - c.outerPadding - circleRadius * 1.6, 2 * circleRadius, 32, c.boldFont, debug, cmyk(0, 0, 0, 0));
    drawTexts(page, [{ text: "Du hast ", font: c.regularFont }, {
        text: "eine Stimme.",
        font: c.boldFont
    }], 12, mm(22), height - mm(11));
    drawTexts(page, [{ text: "You have ", font: c.regularFont }, {
        text: "one vote.",
        font: c.boldFont
    }], 12, mm(22), height - mm(16));
    const fakeList = new List(["List Name"], []);
    const fakeConfig = new ItemConfig(c);
    let sectionWidth = mm(30);
    fakeConfig.width = sectionWidth;
    fakeConfig.nameFont = c.boldFont;
    let start_x = mm(70);
    let start_y = height - c.outerPadding - c.itemHeight;
    drawListField(page, fakeList, start_x, start_y, fakeConfig, debug);
    drawX(page, start_x, start_y, c);
    start_y -= mm(4);
    drawCentredText(page, "Wähle eine Liste", start_x, start_y, sectionWidth, 9, c.regularFont, debug);
    start_y -= mm(4);
    drawCentredText(page, "Vote for one list", start_x, start_y, sectionWidth, 9, c.italicFont, debug);
    start_x += mm(25);
    start_y = height - c.outerPadding - c.itemHeight - mm(1);
    drawCentredText(page, "ODER", start_x, start_y, sectionWidth, 9, c.regularFont, debug);
    start_y -= mm(4);
    drawCentredText(page, "OR", start_x, start_y, sectionWidth, 9, c.italicFont, debug);
    const fakePerson = new Person('99', 'Vorname Nachname', 'Studienfach');
    const fakeConfig2 = new ItemConfig(c);
    fakeConfig2.width = sectionWidth;
    start_x += mm(25);
    start_y = height - c.outerPadding - c.itemHeight;
    drawPerson(page, fakePerson, start_x, start_y, fakeConfig2, true, debug);
    drawX(page, start_x, start_y, c);
    start_y -= mm(4);
    drawCentredText(page, "Wähle eine Person", start_x, start_y, sectionWidth, 9, c.regularFont, debug);
    start_y -= mm(4);
    drawCentredText(page, "Vote for one person", start_x, start_y, sectionWidth, 9, c.italicFont, debug);
    start_x = width / 2;
    sectionWidth = width / 2 - c.outerPadding;
    start_y = height - c.outerPadding - mm(4);
    drawCentredText(page, c.options.topTitle, start_x, start_y, sectionWidth, 12, c.boldFont, debug);
    start_y -= mm(5);
    drawCentredText(page, c.options.title, start_x, start_y, sectionWidth, 12, c.regularFont, debug);
    start_y -= mm(4);
    drawCentredText(page, c.options.titleEN, start_x, start_y, sectionWidth, 10, c.italicFont, debug);
};
const drawTexts = (page, texts, size, x, y) => {
    let start_x = x;
    for (let text of texts) {
        const width = text.font.widthOfTextAtSize(text.text, size);
        page.drawText(text.text, {
            x: start_x,
            y: y,
            size: size,
            font: text.font,
            color: cmyk(0, 0, 0, 1),
        });
        start_x += width;
    }
};

const main = async (outputfile, debug, azb) => {
    try {
    const italicttf = await fetch('fonts/RobotoCondensed-Italic.ttf').then(res => res.arrayBuffer())
    const regularttf = await fetch('fonts/RobotoCondensed-Regular.ttf').then(res => res.arrayBuffer())
    const boldttf = await fetch('fonts/RobotoCondensed-Bold.ttf').then(res => res.arrayBuffer())
    const pdfDoc = await PDFLib.PDFDocument.create();
    pdfDoc.registerFontkit(fontkit)
    const italicFont = await pdfDoc.embedFont(italicttf)
    const regularFont = await pdfDoc.embedFont(regularttf)
    const boldFont = await pdfDoc.embedFont(boldttf)
    const options = JSON.parse(document.getElementById('config-input').value)
    const globalConfig = new GlobalConfig(regularFont, italicFont, boldFont, options, azb);
    const page = pdfDoc.addPage(globalConfig.pageSize);
    const rawData = JSON.parse(document.getElementById('data-input').value);
    const data = Data.fromJson(rawData);
    const rowPaddingHeight = globalConfig.listSpaceHeight - data.getListsHeight(globalConfig) - globalConfig.dashedLineWidth;
    globalConfig.listRowPadding = rowPaddingHeight / data.lists.length;
    if (debug) {
        page.drawRectangle({
            x: globalConfig.outerPadding,
            y: globalConfig.outerPadding,
            width: page.getWidth() - 2 * globalConfig.outerPadding,
                           height: page.getHeight() - 2 * globalConfig.outerPadding,
                           color: cmyk(1, 0, 0, 0),
                           opacity: 0.1,
        });
    }
    if(azb){
        drawAltHeader(page, globalConfig, debug);
    } else {
        drawHeader(page, globalConfig, debug)
    }
    drawLists(page, data, globalConfig, debug);
    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
    document.getElementById(outputfile).src = pdfDataUri;
    } catch (e) {
        alert(e);
    }
};

const generateStimmzettel = () => {
    main('preview', false, false);
}

const generateStimmzettelDebug = () => {
    main('preview', true, false);
}

const generateAuszaehlbogen = () => {
    main('preview', false, true);
}

const generateAuszaehlbogenDebug = () => {
    main('preview', true, true);
}

const addInitialData = () => {
    document.getElementById('config-input').innerHTML = JSON.stringify(defaultOptions, null, 2);
    document.getElementById('data-input').innerHTML = `[
    {
        "listname": [
        "Grüne Hochschulgruppe"
        ],
        "people": [
        {
            "number": "1",
            "name": "Michael Hoch",
            "subjects": "Immunbiologie"
        },
        {
            "number": "2",
            "name": "Michael Hoch",
            "subjects": "Informatik"
        },
        {
            "number": "3",
            "name": "Michael Hoch",
            "subjects": "Psychologie"
        },
        {
            "number": "4",
            "name": "Michael Hoch",
            "subjects": "Volkswirtschaftslehre"
        },
        {
            "number": "5",
            "name": "Michael Hoch",
            "subjects": "Germanistik | evangelische Theologie | Bildungswissenschaften"
        },
        {
            "number": "6",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Skandinavistik"
        },
        {
            "number": "7",
            "name": "Michael Hoch",
            "subjects": "Psychologie"
        },
        {
            "number": "8",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Philosophie | Bildungswissenschaften"
        },
        {
            "number": "9",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "10",
            "name": "Michael Hoch",
            "subjects": "Spanisch | Englisch | Bildungswissenschaften"
        },
        {
            "number": "11",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "12",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "13",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "14",
            "name": "Michael Hoch",
            "subjects": "Lateinische Literatur der Antike und ihr Fortleben | Skandinavistik"
        },
        {
            "number": "15",
            "name": "Michael Hoch",
            "subjects": "Ernährungs- und Lebensmittelwissenschaften"
        },
        {
            "number": "16",
            "name": "Michael Hoch",
            "subjects": "Mathematik"
        },
        {
            "number": "17",
            "name": "Michael Hoch",
            "subjects": "Psychologie"
        },
        {
            "number": "18",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Politik und Gesellschaft"
        },
        {
            "number": "19",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft | Politik und Gesellschaft"
        },
        {
            "number": "20",
            "name": "Michael Hoch",
            "subjects": "Mathematik"
        },
        {
            "number": "21",
            "name": "Michael Hoch",
            "subjects": "Psychologie"
        },
        {
            "number": "22",
            "name": "Michael Hoch",
            "subjects": "Geodäsie und Geoinformation"
        },
        {
            "number": "23",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Geographie"
        },
        {
            "number": "24",
            "name": "Michael Hoch",
            "subjects": "Computer Science"
        },
        {
            "number": "25",
            "name": "Michael Hoch",
            "subjects": "Geographie"
        },
        {
            "number": "26",
            "name": "Michael Hoch",
            "subjects": "Geschichte"
        },
        {
            "number": "27",
            "name": "Michael Hoch",
            "subjects": "Ernährungs- und Lebensmittelwissenschaften"
        },
        {
            "number": "28",
            "name": "Michael Hoch",
            "subjects": "Psychologie"
        },
        {
            "number": "29",
            "name": "Michael Hoch",
            "subjects": "Germanistik | Deutsch als Zweit- und Fremdsprache"
        },
        {
            "number": "30",
            "name": "Michael Hoch",
            "subjects": "Biologie"
        },
        {
            "number": "31",
            "name": "Michael Hoch",
            "subjects": "Immunbiologie"
        },
        {
            "number": "32",
            "name": "Michael Hoch",
            "subjects": "Kunstgeschichte | Geschichte"
        },
        {
            "number": "33",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Philosphie"
        },
        {
            "number": "34",
            "name": "Michael Hoch",
            "subjects": "Ernährungs- und Lebensmittelwissenschaften"
        },
        {
            "number": "35",
            "name": "Michael Hoch",
            "subjects": "Soziologie"
        },
        {
            "number": "36",
            "name": "Michael Hoch",
            "subjects": "Germanistik | Komparatistik"
        },
        {
            "number": "37",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Geschichte"
        }
        ]
    },
    {
        "listname": [
        "Juso-HSG"
        ],
        "people": [
        {
            "number": "1",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "2",
            "name": "Michael Hoch",
            "subjects": "Deutsch | Sozialwissenschaften | Bildungswissenschaften"
        },
        {
            "number": "3",
            "name": "Michael Hoch",
            "subjects": "Physik"
        },
        {
            "number": "4",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "5",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "6",
            "name": "Michael Hoch",
            "subjects": "Physik"
        },
        {
            "number": "7",
            "name": "Michael Hoch",
            "subjects": "Medizin"
        },
        {
            "number": "8",
            "name": "Michael Hoch",
            "subjects": "Medizin"
        },
        {
            "number": "9",
            "name": "Michael Hoch",
            "subjects": "Psychologie"
        },
        {
            "number": "10",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "11",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "12",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Rechtswissenschaft"
        },
        {
            "number": "13",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "14",
            "name": "Michael Hoch",
            "subjects": "Agrarwissenschaft"
        },
        {
            "number": "15",
            "name": "Michael Hoch",
            "subjects": "Medizin | Geschichte | Philosophie"
        },
        {
            "number": "16",
            "name": "Michael Hoch",
            "subjects": "Sozialwissenschaften | Geschichte | Bildungswissenschaften"
        },
        {
            "number": "17",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "18",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "19",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "20",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "21",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "22",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "23",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "24",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "25",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "26",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "27",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "28",
            "name": "Michael Hoch",
            "subjects": "Katholische Theologie | Rechtswissenschaften"
        },
        {
            "number": "29",
            "name": "Michael Hoch",
            "subjects": "Geodäsie und Geoinformatik"
        },
        {
            "number": "30",
            "name": "Michael Hoch",
            "subjects": "Volkswirtschaftslehre"
        },
        {
            "number": "31",
            "name": "Michael Hoch",
            "subjects": "Volkswirtschaftslehre"
        },
        {
            "number": "32",
            "name": "Michael Hoch",
            "subjects": "Economics"
        },
        {
            "number": "33",
            "name": "Michael Hoch",
            "subjects": "Mathematik"
        },
        {
            "number": "34",
            "name": "Michael Hoch",
            "subjects": "Mathematics und Economics"
        },
        {
            "number": "35",
            "name": "Michael Hoch",
            "subjects": "Mathematik"
        },
        {
            "number": "36",
            "name": "Michael Hoch",
            "subjects": "Politkwissenschaft"
        },
        {
            "number": "37",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Psychologie"
        },
        {
            "number": "38",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "39",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Rechtswissenschaft"
        },
        {
            "number": "40",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Geschichte"
        },
        {
            "number": "41",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Psychologie"
        },
        {
            "number": "42",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "43",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "44",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Geographie"
        },
        {
            "number": "45",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "46",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Sprache und Kommunikation in der globalisierten Mediengesellschaft"
        },
        {
            "number": "47",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft | English Studies"
        },
        {
            "number": "48",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "49",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Wirtschaftswissenschaften"
        },
        {
            "number": "50",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Geschichte"
        },
        {
            "number": "51",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft | Psychologie"
        },
        {
            "number": "52",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "53",
            "name": "Michael Hoch",
            "subjects": "Philosophie | Französistik | Mathematik"
        },
        {
            "number": "54",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Anglistik | Bildungswissenschaften"
        },
        {
            "number": "55",
            "name": "Michael Hoch",
            "subjects": "Französistik | Geschichte"
        },
        {
            "number": "56",
            "name": "Michael Hoch",
            "subjects": "Englisch | Geschichte | Bildungswissenschaften"
        },
        {
            "number": "57",
            "name": "Michael Hoch",
            "subjects": "Deutsch | Geschichte | Bildungswissenschaften"
        },
        {
            "number": "58",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Philosophie | Bildungswissenschaften"
        },
        {
            "number": "59",
            "name": "Michael Hoch",
            "subjects": "Geschichte | English Studies"
        },
        {
            "number": "60",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Geografie"
        },
        {
            "number": "61",
            "name": "Michael Hoch",
            "subjects": "Geschichte"
        }
        ]
    },
    {
        "listname": [
        "Ring Christlich-Demokratischer Studenten"
        ],
        "people": [
        {
            "number": "1",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "2",
            "name": "Michael Hoch",
            "subjects": "Mathematik | Geschichte | Philosophie | Bildungswissenschaften"
        },
        {
            "number": "3",
            "name": "Michael Hoch",
            "subjects": "Katholische Theologie | Psychologie"
        },
        {
            "number": "4",
            "name": "Michael Hoch",
            "subjects": "Law and Economics"
        },
        {
            "number": "5",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Englisch | Bildungswissenschaften"
        },
        {
            "number": "6",
            "name": "Michael Hoch",
            "subjects": "Law and Economics"
        },
        {
            "number": "7",
            "name": "Michael Hoch",
            "subjects": "Volkswirtschaftslehre"
        },
        {
            "number": "8",
            "name": "Michael Hoch",
            "subjects": "Medizin"
        },
        {
            "number": "9",
            "name": "Michael Hoch",
            "subjects": "Agrarwissenschaften"
        },
        {
            "number": "10",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "11",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "12",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "13",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "14",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "15",
            "name": "Michael Hoch",
            "subjects": "Asienwissenschaften"
        },
        {
            "number": "16",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "17",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "18",
            "name": "Michael Hoch",
            "subjects": "Mathematik"
        },
        {
            "number": "19",
            "name": "Michael Hoch",
            "subjects": "Geodäsie"
        },
        {
            "number": "20",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "21",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "22",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "23",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "24",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "25",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "26",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "27",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "28",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "29",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "30",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Englisch | Bildungswissenschaften"
        },
        {
            "number": "31",
            "name": "Michael Hoch",
            "subjects": "Politikwissenschaft"
        },
        {
            "number": "32",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "33",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "34",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "35",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "36",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "37",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        }
        ]
    },
    {
        "listname": [
        "Liste Poppelsdorf"
        ],
        "people": [
        {
            "number": "1",
            "name": "Michael Hoch",
            "subjects": "Computer Science | Geodäsie und Geoinformation"
        },
        {
            "number": "2",
            "name": "Michael Hoch",
            "subjects": "Informatik | Bildungswissenschaften"
        },
        {
            "number": "3",
            "name": "Michael Hoch",
            "subjects": "Physik"
        },
        {
            "number": "4",
            "name": "Michael Hoch",
            "subjects": "Informatik"
        },
        {
            "number": "5",
            "name": "Michael Hoch",
            "subjects": "Mathematics | Informatik"
        },
        {
            "number": "6",
            "name": "Michael Hoch",
            "subjects": "Mikrobiologie"
        },
        {
            "number": "7",
            "name": "Michael Hoch",
            "subjects": "Physik"
        },
        {
            "number": "8",
            "name": "Michael Hoch",
            "subjects": "Cyber Security"
        },
        {
            "number": "9",
            "name": "Michael Hoch",
            "subjects": "Physik"
        },
        {
            "number": "10",
            "name": "Michael Hoch",
            "subjects": "Cyber Security"
        },
        {
            "number": "11",
            "name": "Michael Hoch",
            "subjects": "Computer Science"
        },
        {
            "number": "12",
            "name": "Michael Hoch",
            "subjects": "Computer Science | Mathematik"
        }
        ]
    },
    {
        "listname": [
        "Liste undogmatischer StudentInnen (LUST)",
        "- die parteiunabhängige Linke"
        ],
        "people": [
        {
            "number": "1",
            "name": "Michael Hoch",
            "subjects": "Soziologie"
        },
        {
            "number": "2",
            "name": "Michael Hoch",
            "subjects": "Mathematics"
        },
        {
            "number": "3",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Philosophie"
        },
        {
            "number": "4",
            "name": "Michael Hoch",
            "subjects": "Politik & Gesellschaft | Geschichte"
        },
        {
            "number": "5",
            "name": "Michael Hoch",
            "subjects": "Politik & Gesellschaft | Psychologie"
        },
        {
            "number": "6",
            "name": "Michael Hoch",
            "subjects": "Evangelische Theologie | Germanistik | Philosophie"
        },
        {
            "number": "7",
            "name": "Michael Hoch",
            "subjects": "Kunstgeschichte | English Studies"
        },
        {
            "number": "8",
            "name": "Michael Hoch",
            "subjects": "Deutsch | Geschichte | Bildungswissenschaften"
        },
        {
            "number": "9",
            "name": "Michael Hoch",
            "subjects": "Politik & Gesellschaft | Sprache und Kommunikation in der globalisierten Mediengesellschaft"
        },
        {
            "number": "10",
            "name": "Michael Hoch",
            "subjects": "Biologie"
        },
        {
            "number": "11",
            "name": "Michael Hoch",
            "subjects": "Philosophie | Geschichte | Bildungswissenschaften"
        },
        {
            "number": "12",
            "name": "Michael Hoch",
            "subjects": "Geschichte"
        },
        {
            "number": "13",
            "name": "Michael Hoch",
            "subjects": "Komparatistik"
        },
        {
            "number": "14",
            "name": "Michael Hoch",
            "subjects": "Informatik | Cyber Security"
        },
        {
            "number": "15",
            "name": "Michael Hoch",
            "subjects": "Germanistik | English Studies"
        },
        {
            "number": "16",
            "name": "Michael Hoch",
            "subjects": "Mathematik"
        },
        {
            "number": "17",
            "name": "Michael Hoch",
            "subjects": "Politik & Gesellschaft"
        },
        {
            "number": "18",
            "name": "Michael Hoch",
            "subjects": "Evangelische Theologie"
        },
        {
            "number": "19",
            "name": "Michael Hoch",
            "subjects": "Politik & Gesellschaft"
        },
        {
            "number": "20",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Philosophie"
        },
        {
            "number": "21",
            "name": "Michael Hoch",
            "subjects": "Geographie"
        },
        {
            "number": "22",
            "name": "Michael Hoch",
            "subjects": "Mathematics"
        },
        {
            "number": "23",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Philosophie"
        }
        ]
    },
    {
        "listname": [
        "Liberale Hochschulgruppe Bonn - LHG"
        ],
        "people": [
        {
            "number": "1",
            "name": "Michael Hoch",
            "subjects": "Volkswirtschaftslehre"
        },
        {
            "number": "2",
            "name": "Michael Hoch",
            "subjects": "Law and Economics"
        },
        {
            "number": "3",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft"
        },
        {
            "number": "4",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "5",
            "name": "Michael Hoch",
            "subjects": "Geschichte | Philosophie | Bildungswissenschaften"
        },
        {
            "number": "6",
            "name": "Michael Hoch",
            "subjects": "Mathematik"
        },
        {
            "number": "7",
            "name": "Michael Hoch",
            "subjects": "Politisch-Historische Studien"
        },
        {
            "number": "8",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "9",
            "name": "Michael Hoch",
            "subjects": "Chemistry"
        },
        {
            "number": "10",
            "name": "Michael Hoch",
            "subjects": "Mathematics"
        },
        {
            "number": "11",
            "name": "Michael Hoch",
            "subjects": "Law and Economics"
        },
        {
            "number": "12",
            "name": "Michael Hoch",
            "subjects": "Volkswirtschaftslehre"
        },
        {
            "number": "13",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "14",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "15",
            "name": "Michael Hoch",
            "subjects": "Experimentelle Medizin"
        },
        {
            "number": "16",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "17",
            "name": "Michael Hoch",
            "subjects": "Volkswirtschaftslehre"
        },
        {
            "number": "18",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "19",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "20",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "21",
            "name": "Michael Hoch",
            "subjects": "Rechtswissenschaft"
        },
        {
            "number": "22",
            "name": "Michael Hoch",
            "subjects": "Volkswirtschaftslehre"
        },
        {
            "number": "23",
            "name": "Michael Hoch",
            "subjects": "Medizin"
        },
        {
            "number": "24",
            "name": "Michael Hoch",
            "subjects": "Geographie"
        }
        ]
    },
    {
        "listname": [
        "Die Linke.SDS"
        ],
        "people": [
        {
            "number": "1",
            "name": "Michael Hoch",
            "subjects": "Informatik"
        },
        {
            "number": "2",
            "name": "Michael Hoch",
            "subjects": "Archäologie"
        },
        {
            "number": "3",
            "name": "Michael Hoch",
            "subjects": "Mathematik | Sozialwissenschaften |  Bildungswissenschaften"
        },
        {
            "number": "4",
            "name": "Michael Hoch",
            "subjects": "Germanistik | Skandinavistik"
        },
        {
            "number": "5",
            "name": "Michael Hoch",
            "subjects": "Mathematics | Volkswirtschaftslehre"
        },
        {
            "number": "6",
            "name": "Michael Hoch",
            "subjects": "Medienwissenschaft"
        },
        {
            "number": "7",
            "name": "Michael Hoch",
            "subjects": "Asienwissenschaften"
        },
        {
            "number": "8",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft"
        },
        {
            "number": "9",
            "name": "Michael Hoch",
            "subjects": "Politik und Gesellschaft"
        },
        {
            "number": "10",
            "name": "Michael Hoch",
            "subjects": "Sozialwissenschaften | Deutsch | Bildungswissenschaften"
        },
        {
            "number": "10",
            "name": "Michael Hoch",
            "subjects": "Sozialwissenschaften | Deutsch | Bildungswissenschaften"
        }
        ]
    }
    ]
    `;
}


addInitialData();
generateStimmzettelDebug();
