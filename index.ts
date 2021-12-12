#!/usr/bin/env node

import {cmyk, PageSizes, PDFDocument, PDFFont, PDFPage} from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import * as fs from "fs";

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
}

class GlobalConfig {
    outerPadding: number
    itemHeight: number
    columnPadding: number
    listRowPadding: number
    columns: number
    regularFont: PDFFont
    italicFont: PDFFont
    boldFont: PDFFont

    constructor(regularFont: PDFFont, italicFont: PDFFont, boldFont: PDFFont) {
        this.outerPadding = mm(5)
        this.itemHeight = mm(6.5)
        this.columnPadding = mm(3)
        this.listRowPadding = mm(8)
        this.columns = 5
        this.regularFont = regularFont
        this.italicFont = italicFont
        this.boldFont = boldFont
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
        this.height = mm(6.5)
        this.width = (PageSizes.A3[0] - (2 * this.globalConfig.outerPadding) - ((this.globalConfig.columns - 1) * this.globalConfig.columnPadding)) / this.globalConfig.columns
        this.circleRadius = mm(2)
        this.circleWidth = mm(0.25)
        this.circleSpaceWidth = this.circleRadius * 2 + mm(0.25)
        this.numberSpaceWidth = mm(4)
        this.numberSize = 8
        this.numberFont = globalConfig.regularFont
        this.nameSize = 7
        this.nameY = mm(3.5)
        this.nameFont = globalConfig.regularFont
        this.subjectSize = 6
        this.subjectY = mm(1)
        this.subjectFont = globalConfig.italicFont
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
    const numberWidth = c.numberFont.widthOfTextAtSize(person.number, c.numberSize)
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
        page.drawRectangle({
            x: start_x + (c.numberSpaceWidth - numberWidth) / 2,
            y: y + (c.height - referenceHeight) / 2,
            width: numberWidth,
            height: referenceHeight,
            color: cmyk(0, 0, 0, 0.5),
            opacity: 0.5,
        })
    }
    page.drawText(person.number, {
        x: start_x + (c.numberSpaceWidth - numberWidth) / 2,
        y: y + (c.height - referenceHeight) / 2,
        size: c.numberSize,
        font: c.numberFont,
        color: cmyk(0, 0, 0, 1),
    })
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

    drawSmallDottedLine(x, y, c.width)
    if (topLine) {
        drawSmallDottedLine(x, y + c.height, c.width)
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

    if(list.listname.length == 1){
        const width = c.nameFont.widthOfTextAtSize(list.listname[0], c.nameSize)
        const height = c.nameFont.heightAtSize(c.nameSize, {descender: false})
        start_x += (c.nameSpaceWidth - width)/2
        page.drawText(list.listname[0], {
            x: start_x,
            y: y + (c.height - height) / 2,
            size: c.nameSize,
            font: c.nameFont,
            color: cmyk(0, 0, 0, 1),
        })
    } else {
        const width0 = c.nameFont.widthOfTextAtSize(list.listname[0], c.nameSize)
        const width1 = c.nameFont.widthOfTextAtSize(list.listname[1], c.nameSize)
        const height = c.nameFont.heightAtSize(c.nameSize, {descender: false})
        const start_0 = start_x + (c.nameSpaceWidth - width0)/2
        const start_1 = start_x + (c.nameSpaceWidth - width1)/2
        page.drawText(list.listname[0], {
            x: start_0,
            y: y + (c.height - 2*height) / 5 * 3 + height,
            size: c.nameSize,
            font: c.nameFont,
            color: cmyk(0, 0, 0, 1),
        })
        page.drawText(list.listname[1], {
            x: start_1,
            y: y + (c.height - height) / 5,
            size: c.nameSize,
            font: c.nameFont,
            color: cmyk(0, 0, 0, 1),
        })
    }
    drawSmallDottedLine(x, y, c.width)
    drawSmallDottedLine(x, y + c.height, c.width)
}

const drawSmallDottedLine = (x: number, y: number, width: number) => {
    page.drawLine({
        start: {x: x, y: y},
        end: {x: x + width, y: y},
        thickness: 0.25,
        color: cmyk(0, 0, 0, 0.5),
        dashArray: [0, 0.5],
        dashPhase: 0.125 / 2,
        lineCap: 1,
    })
}

const drawList = (page: PDFPage, list: List, y: number, c: GlobalConfig, debug: boolean = true) => {
    const listItemConfig = new ItemConfig(globalConfig);
    listItemConfig.nameFont = c.boldFont
    drawListField(page, list, c.outerPadding, y, listItemConfig, debug)
    let index = 1
    const rowsPerColumn = Math.ceil((list.people.length + 1) / c.columns)
    for (let person of list.people) {
        const column = Math.floor(index / rowsPerColumn)
        const row = index % rowsPerColumn
        const itemConfig = new ItemConfig(globalConfig);
        const x = c.outerPadding + column * itemConfig.width + column * c.columnPadding
        const pos_y = y - row * c.itemHeight
        drawPerson(page, person, x, pos_y, itemConfig, row == 0, debug)
        index++;
    }
}


const drawLists = (current_y: number, debug: boolean = true) => {
    drawDashedLine(current_y + globalConfig.itemHeight + 0.5 * globalConfig.listRowPadding, globalConfig)
    for (let list of data) {
        const listtodraw = List.fromJson(list);
        const rowsPerColumn = Math.ceil((list.people.length + 1) / globalConfig.columns)
        drawList(page, listtodraw, current_y, globalConfig, debug)
        current_y = current_y - rowsPerColumn * globalConfig.itemHeight - globalConfig.listRowPadding
        const line_y = current_y + globalConfig.itemHeight + 0.5 * globalConfig.listRowPadding
        drawDashedLine(line_y, globalConfig)
    }
}

const drawDashedLine = (y: number, c: GlobalConfig) => {
    const dashLength = (PageSizes.A3[0] - globalConfig.outerPadding * 2) / 61
    page.drawLine({
        start: {x: globalConfig.outerPadding, y: y},
        end: {x: PageSizes.A3[0] - globalConfig.outerPadding, y: y},
        thickness: mm(1),
        color: cmyk(0, 0, 0, 0.2),
        dashArray: [dashLength, dashLength],
        dashPhase: 0,
    })
}

// PDF Creation
const pdfDoc = await PDFDocument.create()
pdfDoc.registerFontkit(fontkit)
const italicttf = fs.readFileSync('fonts/RobotoCondensed-Italic.ttf')
const regularttf = fs.readFileSync('fonts/RobotoCondensed-Regular.ttf')
const boldttf = fs.readFileSync('fonts/RobotoCondensed-Bold.ttf')
const italicFont = await pdfDoc.embedFont(italicttf)
const regularFont = await pdfDoc.embedFont(regularttf)
const boldFont = await pdfDoc.embedFont(boldttf)
const page = pdfDoc.addPage(PageSizes.A3)
page.drawRectangle({
    x: mm(5),
    y: mm(5),
    width: PageSizes.A3[0] - mm(10),
    height: mm(391) - mm(5),
    color: cmyk(1, 0, 0, 0),
    opacity: 0.1,
})
const data = JSON.parse(fs.readFileSync('data.json').toString())
const globalConfig = new GlobalConfig(regularFont, italicFont, boldFont)
let current_y = mm(391) - globalConfig.itemHeight
drawLists(current_y);
const pdfBytes = await pdfDoc.save()
fs.writeFileSync('out.pdf', pdfBytes);
