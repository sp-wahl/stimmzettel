#!/usr/bin/env node

import {CMYK, cmyk, PageSizes, PDFDocument, PDFFont, PDFPage} from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import * as fs from "fs";

class GlobalConfig {
    pageSize: [number, number]
    outerPadding: number
    headerHeight: number
    itemHeight: number
    columnPadding: number
    listRowPadding: number
    columns: number
    regularFont: PDFFont
    italicFont: PDFFont
    boldFont: PDFFont
    dottedLineWidth: number
    dashedLineWidth: number

    constructor(regularFont: PDFFont, italicFont: PDFFont, boldFont: PDFFont) {
        this.pageSize = PageSizes.A3
        this.outerPadding = mm(5)
        this.headerHeight = mm(18)
        this.itemHeight = mm(6.5)
        this.columnPadding = mm(3)
        this.listRowPadding = mm(8)
        this.columns = 5
        this.regularFont = regularFont
        this.italicFont = italicFont
        this.boldFont = boldFont
        this.dottedLineWidth = 0.25
        this.dashedLineWidth = mm(2)
    }

    get listSpaceHeight() {
        return this.pageSize[1] - 2 * this.outerPadding - this.headerHeight
    }
}

class ItemConfig {
    globalConfig: GlobalConfig
    height: number
    width: number
    circleSpaceWidth: number
    circleRadius: number
    circleWidth: number
    numberSpaceWidth: number
    numberSize: number
    numberFont: PDFFont
    nameSize: number
    nameY: number
    nameFont: PDFFont
    subjectSize: number
    subjectY: number
    subjectFont: PDFFont

    get nameSpaceWidth(): number {
        return this.width - this.circleSpaceWidth - this.numberSpaceWidth
    }

    constructor(globalConfig: GlobalConfig) {
        this.globalConfig = globalConfig
        this.height = globalConfig.itemHeight
        this.width = (globalConfig.pageSize[0] - (2 * this.globalConfig.outerPadding) - ((this.globalConfig.columns - 1) * this.globalConfig.columnPadding)) / this.globalConfig.columns
        this.circleRadius = mm(2)
        this.circleWidth = mm(0.25)
        this.circleSpaceWidth = this.circleRadius * 2 + mm(0.25)
        this.numberSpaceWidth = mm(4)
        this.numberSize = 8
        this.numberFont = globalConfig.regularFont
        this.nameSize = 7
        this.nameY = 3.5 / 6.5 * this.height
        this.nameFont = globalConfig.regularFont
        this.subjectSize = 6
        this.subjectY = 1 / 6.5 * this.height
        this.subjectFont = globalConfig.italicFont
    }
}

class Data {
    lists: List[]

    constructor(lists) {
        this.lists = lists
    }

    static fromJson(obj: any) {
        return new Data(obj.map(l => List.fromJson(l)))
    }

    getListsHeight(c: GlobalConfig){
        let sum = 0
        for (let list of this.lists) {
            sum += list.getHeight(c)
        }
        return sum
    }
}

class Person {
    number: string
    name: string
    subjects: string

    constructor(number, name, subjects) {
        this.number = number
        this.name = name
        this.subjects = subjects
    }

    static fromJson(obj: any): Person {
        return new Person(obj.number, obj.name, obj.subjects)
    }
}

class List {
    listname: string[]
    people: Person[]

    constructor(listname, people) {
        this.listname = listname
        this.people = people
    }

    static fromJson(obj: any): List {
        return new List(obj.listname, obj.people.map(p => Person.fromJson(p)))
    }

    getRowsPerColumn(c: GlobalConfig) {
        return Math.ceil((this.people.length + 1) / c.columns)
    }

    getHeight(c: GlobalConfig) {
        const rowsPerColumn = this.getRowsPerColumn(c)
        return c.itemHeight * rowsPerColumn
    }
}

const mm = (value: number): number => {
    return value * 72 / 25.4
}

const drawPerson = (page: PDFPage, person: Person, x: number, y: number, c: ItemConfig, topLine: boolean = false, debug: boolean = true) => {
    if (debug) {
        page.drawRectangle({
            x: x,
            y: y,
            width: c.width,
            height: c.height,
            color: cmyk(0, 1, 0, 0),
            opacity: 0.5,
        })
    }
    let start_x = x + (c.circleWidth / 2)
    if (debug) {
        page.drawRectangle({
            x: x,
            y: y,
            width: c.circleSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.3, 0),
            opacity: 0.5,
        })
    }
    page.drawCircle({
        x: start_x + c.circleRadius,
        y: y + (c.height / 2),
        size: c.circleRadius,
        borderColor: cmyk(0, 0, 0, 1),
        borderWidth: c.circleWidth,
    })
    start_x = x + c.circleSpaceWidth
    const referenceHeight = c.numberFont.heightAtSize(c.numberSize, {descender: false})
    if (debug) {
        page.drawRectangle({
            x: start_x,
            y: y,
            width: c.numberSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.6, 0),
            opacity: 0.5,
        })
    }
    drawCentredText(page, person.number, start_x, y + (c.height - referenceHeight) / 2, c.numberSpaceWidth, c.numberSize, c.numberFont, debug)
    start_x += c.numberSpaceWidth
    if (debug) {
        page.drawRectangle({
            x: start_x,
            y: y,
            width: c.nameSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.9, 0),
            opacity: 0.5,
        })
    }
    const textWidth = c.nameFont.widthOfTextAtSize(person.name, c.nameSize)
    const textHeight = c.nameFont.heightAtSize(c.nameSize, {descender: false})
    let nameScale = 1
    if (textWidth > c.nameSpaceWidth) {
        nameScale = c.nameSpaceWidth / textWidth
        if (debug) {
            page.drawRectangle({
                x: start_x,
                y: y + c.nameY,
                width: textWidth,
                height: textHeight,
                color: cmyk(0, 1, 1, 0),
                opacity: 0.5,
            })
        }
    }
    page.drawText(person.name, {
        x: start_x,
        y: y + c.nameY,
        size: c.nameSize,
        font: c.nameFont,
        color: cmyk(0, 0, 0, 1),
        matrix: [nameScale, 0, 0, 1, 0, 0],
    })
    const subjectsWidth = c.subjectFont.widthOfTextAtSize(person.subjects, c.subjectSize)
    const subjectsHeight = c.subjectFont.heightAtSize(c.subjectSize, {descender: false})
    let subjectsScale = 1
    if (subjectsWidth > c.nameSpaceWidth) {
        subjectsScale = c.nameSpaceWidth / subjectsWidth
        if (debug) {
            page.drawRectangle({
                x: start_x,
                y: y + c.subjectY,
                width: subjectsWidth,
                height: subjectsHeight,
                color: cmyk(0, 1, 1, 0),
                opacity: 0.5,
            })
        }
    }
    page.drawText(person.subjects, {
        x: start_x,
        y: y + c.subjectY,
        size: c.subjectSize,
        font: c.subjectFont,
        color: cmyk(0, 0, 0, 0.7),
        matrix: [subjectsScale, 0, 0, 1, 0, 0],
    })

    drawSmallDottedLine(page, x, y, c.width, c.globalConfig)
    if (topLine) {
        drawSmallDottedLine(page, x, y + c.height, c.width, c.globalConfig)
    }
}

const drawListField = (page: PDFPage, list: List, x: number, y: number, c: ItemConfig, debug: boolean = true) => {
    if (debug) {
        page.drawRectangle({
            x: x,
            y: y,
            width: c.width,
            height: c.height,
            color: cmyk(0, 1, 0, 0),
            opacity: 0.5,
        })
    }
    let start_x = x + (c.circleWidth / 2)
    if (debug) {
        page.drawRectangle({
            x: x,
            y: y,
            width: c.circleSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.3, 0),
            opacity: 0.5,
        })
    }
    page.drawCircle({
        x: start_x + c.circleRadius,
        y: y + (c.height / 2),
        size: c.circleRadius,
        borderColor: cmyk(0, 0, 0, 1),
        borderWidth: c.circleWidth,
    })
    start_x = x + c.circleSpaceWidth + c.numberSpaceWidth
    if (debug) {
        page.drawRectangle({
            x: start_x,
            y: y,
            width: c.nameSpaceWidth,
            height: c.height,
            color: cmyk(0, 0, 0.9, 0),
            opacity: 0.5,
        })
    }
    page.drawRectangle({
        x: start_x,
        y: y,
        width: c.nameSpaceWidth,
        height: c.height,
        color: cmyk(0, 0, 0, 0.3),
        opacity: 1,
    })

    const height = c.nameFont.heightAtSize(c.nameSize, {descender: false})
    if (list.listname.length == 1) {
        drawCentredText(page, list.listname[0], start_x, y + (c.height - height) / 2, c.nameSpaceWidth, c.nameSize, c.nameFont, debug)
    } else {
        let topLineY = y + (c.height - 2 * height) / 5 * 3 + height;
        let bottomLineY = y + (c.height - height) / 5;
        drawCentredText(page, list.listname[0], start_x, topLineY, c.nameSpaceWidth, c.nameSize, c.nameFont, debug)
        drawCentredText(page, list.listname[1], start_x, bottomLineY, c.nameSpaceWidth, c.nameSize, c.nameFont, debug)
    }
    drawSmallDottedLine(page, x, y, c.width, c.globalConfig)
    drawSmallDottedLine(page, x, y + c.height, c.width, c.globalConfig)
}

const drawCentredText = (page, text: string, x: number, y: number, width: number, size: number, font: PDFFont, debug: boolean = true, color: CMYK = cmyk(0, 0, 0, 1)) => {
    const textWidth = font.widthOfTextAtSize(text, size)
    let start_x = x + (width - textWidth) / 2
    if (debug) {
        const textHeight = font.heightAtSize(size, {descender: false})
        page.drawRectangle({
            x: start_x,
            y: y,
            width: textWidth,
            height: textHeight,
            color: cmyk(1, 1, 0, 0),
            opacity: 0.2,
        })
    }
    let nameScale = 1
    if (textWidth > width) {
        nameScale = width / textWidth
        start_x = x
        if (debug) {
            const textHeight = font.heightAtSize(size, {descender: false})
            page.drawRectangle({
                x: start_x,
                y: y,
                width: textWidth,
                height: textHeight,
                color: cmyk(0, 1, 1, 0),
                opacity: 0.5,
            })
        }
    }
    page.drawText(text, {
        x: start_x,
        y: y,
        size: size,
        font: font,
        color: color,
        matrix: [nameScale, 0, 0, 1, 0, 0],
    })
}

const drawSmallDottedLine = (page: PDFPage, x: number, y: number, width: number, c: GlobalConfig) => {
    page.drawLine({
        start: {x: x, y: y},
        end: {x: x + width, y: y},
        thickness: c.dottedLineWidth,
        color: cmyk(0, 0, 0, 0.5),
        dashArray: [0, 0.5],
        dashPhase: c.dottedLineWidth / 4,
        lineCap: 1,
    })
}

const drawList = (page: PDFPage, list: List, y: number, c: GlobalConfig, debug: boolean = true) => {
    const listItemConfig = new ItemConfig(c);
    listItemConfig.nameFont = c.boldFont
    drawListField(page, list, c.outerPadding, y, listItemConfig, debug)
    let index = 1
    const rowsPerColumn = list.getRowsPerColumn(c)
    for (let person of list.people) {
        const column = Math.floor(index / rowsPerColumn)
        const row = index % rowsPerColumn
        const itemConfig = new ItemConfig(c);
        const x = c.outerPadding + column * itemConfig.width + column * c.columnPadding
        const pos_y = y - row * c.itemHeight
        drawPerson(page, person, x, pos_y, itemConfig, row == 0, debug)
        index++;
    }
}


const drawLists = (page: PDFPage, data: Data, c: GlobalConfig, debug: boolean = true) => {
    let current_y = page.getHeight() - c.outerPadding - c.headerHeight - c.dashedLineWidth / 2
    drawDashedLine(page, current_y, c)
    current_y -= (0.5 * c.listRowPadding + c.itemHeight)
    for (let list of data.lists) {
        const listtodraw = List.fromJson(list);
        const rowsPerColumn = list.getRowsPerColumn(c)
        drawList(page, listtodraw, current_y, c, debug)
        current_y = current_y - rowsPerColumn * c.itemHeight - c.listRowPadding
        const line_y = current_y + c.itemHeight + 0.5 * c.listRowPadding
        drawDashedLine(page, line_y, c)
    }
}

const drawDashedLine = (page: PDFPage, y: number, c: GlobalConfig) => {
    const dashLength = (page.getWidth() - c.outerPadding * 2) / 61
    page.drawLine({
        start: {x: c.outerPadding, y: y},
        end: {x: page.getWidth() - c.outerPadding, y: y},
        thickness: c.dashedLineWidth,
        color: cmyk(0, 0, 0, 0.2),
        dashArray: [dashLength, dashLength],
        dashPhase: 0,
    })
}

function drawX(page: PDFPage, start_x: number, start_y: number, c: GlobalConfig) {
    page.drawLine({
        start: {x: start_x, y: start_y + 2},
        end: {x: start_x + c.itemHeight - 5, y: start_y + c.itemHeight - 2},
        thickness: 2,
        color: cmyk(0, 0, 0, 1),
        lineCap: 1,
    })
    page.drawLine({
        start: {x: start_x + 1, y: start_y + c.itemHeight - 2},
        end: {x: start_x + c.itemHeight - 5, y: start_y + 2},
        thickness: 2,
        color: cmyk(0, 0, 0, 1),
        lineCap: 1,
    })
}

const drawHeader = (page: PDFPage, c: GlobalConfig, debug: boolean = true) => {
    const {width, height} = page.getSize()

    if (debug) {
        page.drawRectangle({
            x: c.outerPadding,
            y: height - c.outerPadding - c.headerHeight,
            width: width - 2 * c.outerPadding,
            height: c.headerHeight,
            color: cmyk(0, 1, 1, 0),
            opacity: 0.3,
        })
    }

    const circleRadius = mm(7)
    page.drawCircle({
        x: c.outerPadding + circleRadius,
        y: height - c.outerPadding - circleRadius,
        size: circleRadius,
        color: cmyk(0, 0, 0, 0.9),
    })
    drawCentredText(page, "?", c.outerPadding, height - c.outerPadding - circleRadius * 1.6, 2 * circleRadius, 32, c.boldFont, debug, cmyk(0, 0, 0, 0))

    drawTexts(page, [{text: "Du hast ", font: c.regularFont}, {
        text: "eine Stimme.",
        font: c.boldFont
    }], 12, mm(22), height - mm(11))
    drawTexts(page, [{text: "You have ", font: c.regularFont}, {
        text: "one vote.",
        font: c.boldFont
    }], 12, mm(22), height - mm(16))

    const fakeList = new List(["List Name"], [])
    const fakeConfig = new ItemConfig(c)
    let sectionWidth = mm(30)
    fakeConfig.width = sectionWidth
    fakeConfig.nameFont = c.boldFont
    let start_x = mm(70)
    let start_y = height - c.outerPadding - c.itemHeight
    drawListField(page, fakeList, start_x, start_y, fakeConfig, debug)
    drawX(page, start_x, start_y, c);

    start_y -= mm(4)
    drawCentredText(page, "Wähle eine Liste", start_x, start_y, sectionWidth, 9, c.regularFont, debug)
    start_y -= mm(4)
    drawCentredText(page, "Vote for one list", start_x, start_y, sectionWidth, 9, c.italicFont, debug)


    start_x += mm(25)
    start_y = height - c.outerPadding - c.itemHeight - mm(1)
    drawCentredText(page, "ODER", start_x, start_y, sectionWidth, 9, c.regularFont, debug)
    start_y -= mm(4)
    drawCentredText(page, "OR", start_x, start_y, sectionWidth, 9, c.italicFont, debug)

    const fakePerson = new Person('99', 'Vorname Nachname', 'Studienfach')
    const fakeConfig2 = new ItemConfig(c)
    fakeConfig2.width = sectionWidth
    start_x += mm(25)
    start_y = height - c.outerPadding - c.itemHeight
    drawPerson(page, fakePerson, start_x, start_y, fakeConfig2, true, debug)
    drawX(page, start_x, start_y, c);

    start_y -= mm(4)
    drawCentredText(page, "Wähle eine Person", start_x, start_y, sectionWidth, 9, c.regularFont, debug)
    start_y -= mm(4)
    drawCentredText(page, "Vote for one person", start_x, start_y, sectionWidth, 9, c.italicFont, debug)

    start_x = width / 2
    sectionWidth = width / 2 - c.outerPadding
    start_y = height - c.outerPadding - mm(4)
    drawCentredText(page, "SP-Stimmzettel / SP Ballot", start_x, start_y, sectionWidth, 12, c.boldFont, debug)
    start_y -= mm(5)
    drawCentredText(page, "Wahl zum 44. Studierendenparlament der RFWU Bonn — 20. Januar 2022", start_x, start_y, sectionWidth, 12, c.regularFont, debug)
    start_y -= mm(4)
    drawCentredText(page, "Election of the 44th Student Parliament of the University of Bonn — 20th January 2022\n", start_x, start_y, sectionWidth, 10, c.italicFont, debug)
}

interface TextCfg {
    text: string
    font: PDFFont
}

const drawTexts = (page: PDFPage, texts: TextCfg[], size: number, x: number, y: number) => {
    let start_x = x
    for (let text of texts) {
        const width = text.font.widthOfTextAtSize(text.text, size)
        page.drawText(text.text, {
            x: start_x,
            y: y,
            size: size,
            font: text.font,
            color: cmyk(0, 0, 0, 1),
        })
        start_x += width
    }
}

const main = async (inputfile: string, outputfile: string, debug: boolean) => {
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    const italicttf = fs.readFileSync('fonts/RobotoCondensed-Italic.ttf')
    const regularttf = fs.readFileSync('fonts/RobotoCondensed-Regular.ttf')
    const boldttf = fs.readFileSync('fonts/RobotoCondensed-Bold.ttf')
    const italicFont = await pdfDoc.embedFont(italicttf)
    const regularFont = await pdfDoc.embedFont(regularttf)
    const boldFont = await pdfDoc.embedFont(boldttf)
    const globalConfig = new GlobalConfig(regularFont, italicFont, boldFont)
    const page = pdfDoc.addPage(globalConfig.pageSize)
    const rawData = JSON.parse(fs.readFileSync(inputfile).toString())
    const data = Data.fromJson(rawData)

    const rowPaddingHeight = globalConfig.listSpaceHeight - data.getListsHeight(globalConfig) - globalConfig.dashedLineWidth
    globalConfig.listRowPadding = rowPaddingHeight / data.lists.length

    if (debug) {
        page.drawRectangle({
            x: globalConfig.outerPadding,
            y: globalConfig.outerPadding,
            width: page.getWidth() - 2 * globalConfig.outerPadding,
            height: page.getHeight() - 2 * globalConfig.outerPadding,
            color: cmyk(1, 0, 0, 0),
            opacity: 0.1,
        })
    }
    drawHeader(page, globalConfig, debug)
    drawLists(page, data, globalConfig, debug)
    const pdfBytes = await pdfDoc.save()
    fs.writeFileSync(outputfile, pdfBytes)
}

await main('sample.json', 'out.pdf', true)
