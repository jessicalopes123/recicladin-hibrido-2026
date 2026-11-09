// www/js/supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
var SUPABASE_URL = "https://cxwrraqccjurvshbqnog.supabase.co";
var SUPABASE_PUBLISHABLE_KEY = "sb_publishable_vVuFQVrCevrlh8GPbARPhg_7jNrzK4Q";
var supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
var isSupabaseConfigured = () => SUPABASE_URL.startsWith("https://") && SUPABASE_PUBLISHABLE_KEY !== "COLE_SUA_PUBLISHABLE_KEY_AQUI" && SUPABASE_PUBLISHABLE_KEY.length > 20;

// node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.mjs
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (Object.prototype.hasOwnProperty.call(b2, p)) d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  if (typeof b !== "function" && b !== null)
    throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function() {
  __assign = Object.assign || function __assign2(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function autoTableText(text, x, y, styles, doc) {
  styles = styles || {};
  var PHYSICAL_LINE_HEIGHT = 1.15;
  var k = doc.internal.scaleFactor;
  var fontSize = doc.internal.getFontSize() / k;
  var lineHeightFactor = doc.getLineHeightFactor ? doc.getLineHeightFactor() : PHYSICAL_LINE_HEIGHT;
  var lineHeight = fontSize * lineHeightFactor;
  var splitRegex = /\r\n|\r|\n/g;
  var splitText = "";
  var lineCount = 1;
  if (styles.valign === "middle" || styles.valign === "bottom" || styles.halign === "center" || styles.halign === "right") {
    splitText = typeof text === "string" ? text.split(splitRegex) : text;
    lineCount = splitText.length || 1;
  }
  y += fontSize * (2 - PHYSICAL_LINE_HEIGHT);
  if (styles.valign === "middle")
    y -= lineCount / 2 * lineHeight;
  else if (styles.valign === "bottom")
    y -= lineCount * lineHeight;
  if (styles.halign === "center" || styles.halign === "right") {
    var alignSize = fontSize;
    if (styles.halign === "center")
      alignSize *= 0.5;
    if (splitText && lineCount >= 1) {
      for (var iLine = 0; iLine < splitText.length; iLine++) {
        doc.text(splitText[iLine], x - doc.getStringUnitWidth(splitText[iLine]) * alignSize, y, styles.textOptions);
        y += lineHeight;
      }
      return doc;
    }
    x -= doc.getStringUnitWidth(text) * alignSize;
  }
  if (styles.halign === "justify") {
    doc.text(text, x, y, __assign({ maxWidth: styles.maxWidth || 100, align: "justify" }, styles.textOptions));
  } else {
    doc.text(text, x, y, styles.textOptions);
  }
  return doc;
}
var globalDefaults = {};
var DocHandler = (
  /** @class */
  (function() {
    function DocHandler2(jsPDFDocument) {
      this.jsPDFDocument = jsPDFDocument;
      this.userStyles = {
        // Black for versions of jspdf without getTextColor
        textColor: jsPDFDocument.getTextColor ? this.jsPDFDocument.getTextColor() : 0,
        fontSize: jsPDFDocument.internal.getFontSize(),
        fontStyle: jsPDFDocument.internal.getFont().fontStyle,
        font: jsPDFDocument.internal.getFont().fontName,
        // 0 for versions of jspdf without getLineWidth
        lineWidth: jsPDFDocument.getLineWidth ? this.jsPDFDocument.getLineWidth() : 0,
        // Black for versions of jspdf without getDrawColor
        lineColor: jsPDFDocument.getDrawColor ? this.jsPDFDocument.getDrawColor() : 0
      };
    }
    DocHandler2.setDefaults = function(defaults, doc) {
      if (doc === void 0) {
        doc = null;
      }
      if (doc) {
        doc.__autoTableDocumentDefaults = defaults;
      } else {
        globalDefaults = defaults;
      }
    };
    DocHandler2.unifyColor = function(c) {
      if (Array.isArray(c)) {
        return c;
      } else if (typeof c === "number") {
        return [c, c, c];
      } else if (typeof c === "string") {
        return [c];
      } else {
        return null;
      }
    };
    DocHandler2.prototype.applyStyles = function(styles, fontOnly) {
      var _a2, _b, _c;
      if (fontOnly === void 0) {
        fontOnly = false;
      }
      if (styles.fontStyle && this.jsPDFDocument.setFontStyle) {
        this.jsPDFDocument.setFontStyle(styles.fontStyle);
      }
      var _d = this.jsPDFDocument.internal.getFont(), fontStyle = _d.fontStyle, fontName = _d.fontName;
      if (styles.font)
        fontName = styles.font;
      if (styles.fontStyle) {
        fontStyle = styles.fontStyle;
        var availableFontStyles = this.getFontList()[fontName];
        if (availableFontStyles && availableFontStyles.indexOf(fontStyle) === -1 && this.jsPDFDocument.setFontStyle) {
          this.jsPDFDocument.setFontStyle(availableFontStyles[0]);
          fontStyle = availableFontStyles[0];
        }
      }
      this.jsPDFDocument.setFont(fontName, fontStyle);
      if (styles.fontSize)
        this.jsPDFDocument.setFontSize(styles.fontSize);
      if (fontOnly) {
        return;
      }
      var color = DocHandler2.unifyColor(styles.fillColor);
      if (color)
        (_a2 = this.jsPDFDocument).setFillColor.apply(_a2, color);
      color = DocHandler2.unifyColor(styles.textColor);
      if (color)
        (_b = this.jsPDFDocument).setTextColor.apply(_b, color);
      color = DocHandler2.unifyColor(styles.lineColor);
      if (color)
        (_c = this.jsPDFDocument).setDrawColor.apply(_c, color);
      if (typeof styles.lineWidth === "number") {
        this.jsPDFDocument.setLineWidth(styles.lineWidth);
      }
    };
    DocHandler2.prototype.splitTextToSize = function(text, size, opts) {
      return this.jsPDFDocument.splitTextToSize(text, size, opts);
    };
    DocHandler2.prototype.rect = function(x, y, width, height, fillStyle) {
      return this.jsPDFDocument.rect(x, y, width, height, fillStyle);
    };
    DocHandler2.prototype.getLastAutoTable = function() {
      return this.jsPDFDocument.lastAutoTable || null;
    };
    DocHandler2.prototype.getTextWidth = function(text) {
      return this.jsPDFDocument.getTextWidth(text);
    };
    DocHandler2.prototype.getDocument = function() {
      return this.jsPDFDocument;
    };
    DocHandler2.prototype.setPage = function(page) {
      this.jsPDFDocument.setPage(page);
    };
    DocHandler2.prototype.addPage = function() {
      return this.jsPDFDocument.addPage();
    };
    DocHandler2.prototype.getFontList = function() {
      return this.jsPDFDocument.getFontList();
    };
    DocHandler2.prototype.getGlobalOptions = function() {
      return globalDefaults || {};
    };
    DocHandler2.prototype.getDocumentOptions = function() {
      return this.jsPDFDocument.__autoTableDocumentDefaults || {};
    };
    DocHandler2.prototype.pageSize = function() {
      var pageSize = this.jsPDFDocument.internal.pageSize;
      if (pageSize.width == null) {
        pageSize = { width: pageSize.getWidth(), height: pageSize.getHeight() };
      }
      return pageSize;
    };
    DocHandler2.prototype.scaleFactor = function() {
      return this.jsPDFDocument.internal.scaleFactor;
    };
    DocHandler2.prototype.getLineHeightFactor = function() {
      var doc = this.jsPDFDocument;
      return doc.getLineHeightFactor ? doc.getLineHeightFactor() : 1.15;
    };
    DocHandler2.prototype.getLineHeight = function(fontSize) {
      return fontSize / this.scaleFactor() * this.getLineHeightFactor();
    };
    DocHandler2.prototype.pageNumber = function() {
      var pageInfo = this.jsPDFDocument.internal.getCurrentPageInfo();
      if (!pageInfo) {
        return this.jsPDFDocument.internal.getNumberOfPages();
      }
      return pageInfo.pageNumber;
    };
    return DocHandler2;
  })()
);
var HtmlRowInput = (
  /** @class */
  (function(_super) {
    __extends(HtmlRowInput2, _super);
    function HtmlRowInput2(element) {
      var _this = _super.call(this) || this;
      _this._element = element;
      return _this;
    }
    return HtmlRowInput2;
  })(Array)
);
function defaultStyles(scaleFactor) {
  return {
    font: "helvetica",
    // helvetica, times, courier
    fontStyle: "normal",
    // normal, bold, italic, bolditalic
    overflow: "linebreak",
    // linebreak, ellipsize, visible or hidden
    fillColor: false,
    // Either false for transparent, rbg array e.g. [255, 255, 255] or gray level e.g 200
    textColor: 20,
    halign: "left",
    // left, center, right, justify
    valign: "top",
    // top, middle, bottom
    fontSize: 10,
    cellPadding: 5 / scaleFactor,
    // number or {top,left,right,left,vertical,horizontal}
    lineColor: 200,
    lineWidth: 0,
    cellWidth: "auto",
    // 'auto'|'wrap'|number
    minCellHeight: 0,
    minCellWidth: 0,
    textOptions: { isInputVisual: false, isOutputVisual: void 0, isInputRtl: false, isOutputRtl: void 0, isSymmetricSwapping: false }
  };
}
function getTheme(name) {
  var themes = {
    striped: {
      table: { fillColor: 255, textColor: 80, fontStyle: "normal" },
      head: { textColor: 255, fillColor: [41, 128, 185], fontStyle: "bold" },
      body: {},
      foot: { textColor: 255, fillColor: [41, 128, 185], fontStyle: "bold" },
      alternateRow: { fillColor: 245 }
    },
    grid: {
      table: {
        fillColor: 255,
        textColor: 80,
        fontStyle: "normal",
        lineWidth: 0.1
      },
      head: {
        textColor: 255,
        fillColor: [26, 188, 156],
        fontStyle: "bold",
        lineWidth: 0
      },
      body: {},
      foot: {
        textColor: 255,
        fillColor: [26, 188, 156],
        fontStyle: "bold",
        lineWidth: 0
      },
      alternateRow: {}
    },
    plain: { head: { fontStyle: "bold" }, foot: { fontStyle: "bold" } }
  };
  return themes[name];
}
function getStringWidth(text, styles, doc) {
  doc.applyStyles(styles, true);
  var textArr = Array.isArray(text) ? text : [text];
  var widestLineWidth = textArr.map(function(text2) {
    return doc.getTextWidth(text2);
  }).reduce(function(a, b) {
    return Math.max(a, b);
  }, 0);
  return widestLineWidth;
}
function addTableBorder(doc, table, startPos, cursor) {
  var lineWidth = table.settings.tableLineWidth;
  var lineColor = table.settings.tableLineColor;
  doc.applyStyles({ lineWidth, lineColor });
  var fillStyle = getFillStyle(lineWidth, false);
  if (fillStyle) {
    doc.rect(startPos.x, startPos.y, table.getWidth(doc.pageSize().width), cursor.y - startPos.y, fillStyle);
  }
}
function getFillStyle(lineWidth, fillColor) {
  var drawLine = lineWidth > 0;
  var drawBackground = fillColor || fillColor === 0;
  if (drawLine && drawBackground) {
    return "DF";
  } else if (drawLine) {
    return "S";
  } else if (drawBackground) {
    return "F";
  } else {
    return null;
  }
}
function parseSpacing(value, defaultValue) {
  var _a2, _b, _c, _d;
  value = value || defaultValue;
  if (Array.isArray(value)) {
    if (value.length >= 4) {
      return {
        top: value[0],
        right: value[1],
        bottom: value[2],
        left: value[3]
      };
    } else if (value.length === 3) {
      return {
        top: value[0],
        right: value[1],
        bottom: value[2],
        left: value[1]
      };
    } else if (value.length === 2) {
      return {
        top: value[0],
        right: value[1],
        bottom: value[0],
        left: value[1]
      };
    } else if (value.length === 1) {
      value = value[0];
    } else {
      value = defaultValue;
    }
  }
  if (typeof value === "object") {
    if (typeof value.vertical === "number") {
      value.top = value.vertical;
      value.bottom = value.vertical;
    }
    if (typeof value.horizontal === "number") {
      value.right = value.horizontal;
      value.left = value.horizontal;
    }
    return {
      left: (_a2 = value.left) !== null && _a2 !== void 0 ? _a2 : defaultValue,
      top: (_b = value.top) !== null && _b !== void 0 ? _b : defaultValue,
      right: (_c = value.right) !== null && _c !== void 0 ? _c : defaultValue,
      bottom: (_d = value.bottom) !== null && _d !== void 0 ? _d : defaultValue
    };
  }
  if (typeof value !== "number") {
    value = defaultValue;
  }
  return { top: value, right: value, bottom: value, left: value };
}
function getPageAvailableWidth(doc, table) {
  var margins = parseSpacing(table.settings.margin, 0);
  return doc.pageSize().width - (margins.left + margins.right);
}
function parseCss(supportedFonts, element, scaleFactor, style, window2) {
  var result = {};
  var pxScaleFactor = 96 / 72;
  var backgroundColor = parseColor(element, function(elem) {
    return window2.getComputedStyle(elem)["backgroundColor"];
  });
  if (backgroundColor != null)
    result.fillColor = backgroundColor;
  var textColor = parseColor(element, function(elem) {
    return window2.getComputedStyle(elem)["color"];
  });
  if (textColor != null)
    result.textColor = textColor;
  var padding = parsePadding(style, scaleFactor);
  if (padding)
    result.cellPadding = padding;
  var borderColorSide = "borderTopColor";
  var finalScaleFactor = pxScaleFactor * scaleFactor;
  var btw = style.borderTopWidth;
  if (style.borderBottomWidth === btw && style.borderRightWidth === btw && style.borderLeftWidth === btw) {
    var borderWidth = (parseFloat(btw) || 0) / finalScaleFactor;
    if (borderWidth)
      result.lineWidth = borderWidth;
  } else {
    result.lineWidth = {
      top: (parseFloat(style.borderTopWidth) || 0) / finalScaleFactor,
      right: (parseFloat(style.borderRightWidth) || 0) / finalScaleFactor,
      bottom: (parseFloat(style.borderBottomWidth) || 0) / finalScaleFactor,
      left: (parseFloat(style.borderLeftWidth) || 0) / finalScaleFactor
    };
    if (!result.lineWidth.top) {
      if (result.lineWidth.right) {
        borderColorSide = "borderRightColor";
      } else if (result.lineWidth.bottom) {
        borderColorSide = "borderBottomColor";
      } else if (result.lineWidth.left) {
        borderColorSide = "borderLeftColor";
      }
    }
  }
  var borderColor = parseColor(element, function(elem) {
    return window2.getComputedStyle(elem)[borderColorSide];
  });
  if (borderColor != null)
    result.lineColor = borderColor;
  var accepted = ["left", "right", "center", "justify"];
  if (accepted.indexOf(style.textAlign) !== -1) {
    result.halign = style.textAlign;
  }
  accepted = ["middle", "bottom", "top"];
  if (accepted.indexOf(style.verticalAlign) !== -1) {
    result.valign = style.verticalAlign;
  }
  var res = parseInt(style.fontSize || "");
  if (!isNaN(res))
    result.fontSize = res / pxScaleFactor;
  var fontStyle = parseFontStyle(style);
  if (fontStyle)
    result.fontStyle = fontStyle;
  var font = (style.fontFamily || "").toLowerCase();
  if (supportedFonts.indexOf(font) !== -1) {
    result.font = font;
  }
  return result;
}
function parseFontStyle(style) {
  var res = "";
  if (style.fontWeight === "bold" || style.fontWeight === "bolder" || parseInt(style.fontWeight) >= 700) {
    res = "bold";
  }
  if (style.fontStyle === "italic" || style.fontStyle === "oblique") {
    res += "italic";
  }
  return res;
}
function parseColor(element, styleGetter) {
  var cssColor = realColor(element, styleGetter);
  if (!cssColor)
    return null;
  var rgba = cssColor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*\.?\d*))?\)$/);
  if (!rgba || !Array.isArray(rgba)) {
    return null;
  }
  var color = [
    parseInt(rgba[1]),
    parseInt(rgba[2]),
    parseInt(rgba[3])
  ];
  var alpha = parseInt(rgba[4]);
  if (alpha === 0 || isNaN(color[0]) || isNaN(color[1]) || isNaN(color[2])) {
    return null;
  }
  return color;
}
function realColor(elem, styleGetter) {
  var bg = styleGetter(elem);
  if (bg === "rgba(0, 0, 0, 0)" || bg === "transparent" || bg === "initial" || bg === "inherit") {
    if (elem.parentElement == null) {
      return null;
    }
    return realColor(elem.parentElement, styleGetter);
  } else {
    return bg;
  }
}
function parsePadding(style, scaleFactor) {
  var val = [
    style.paddingTop,
    style.paddingRight,
    style.paddingBottom,
    style.paddingLeft
  ];
  var pxScaleFactor = 96 / (72 / scaleFactor);
  var linePadding = (parseInt(style.lineHeight) - parseInt(style.fontSize)) / scaleFactor / 2;
  var inputPadding = val.map(function(n) {
    return parseInt(n || "0") / pxScaleFactor;
  });
  var padding = parseSpacing(inputPadding, 0);
  if (linePadding > padding.top) {
    padding.top = linePadding;
  }
  if (linePadding > padding.bottom) {
    padding.bottom = linePadding;
  }
  return padding;
}
function parseHtml(doc, input, window2, includeHiddenHtml, useCss) {
  var _a2, _b;
  if (includeHiddenHtml === void 0) {
    includeHiddenHtml = false;
  }
  if (useCss === void 0) {
    useCss = false;
  }
  var tableElement;
  if (typeof input === "string") {
    tableElement = window2.document.querySelector(input);
  } else {
    tableElement = input;
  }
  var supportedFonts = Object.keys(doc.getFontList());
  var scaleFactor = doc.scaleFactor();
  var head = [], body = [], foot = [];
  if (!tableElement) {
    console.error("Html table could not be found with input: ", input);
    return { head, body, foot };
  }
  for (var i = 0; i < tableElement.rows.length; i++) {
    var element = tableElement.rows[i];
    var tagName = (_b = (_a2 = element === null || element === void 0 ? void 0 : element.parentElement) === null || _a2 === void 0 ? void 0 : _a2.tagName) === null || _b === void 0 ? void 0 : _b.toLowerCase();
    var row = parseRowContent(supportedFonts, scaleFactor, window2, element, includeHiddenHtml, useCss);
    if (!row)
      continue;
    if (tagName === "thead") {
      head.push(row);
    } else if (tagName === "tfoot") {
      foot.push(row);
    } else {
      body.push(row);
    }
  }
  return { head, body, foot };
}
function parseRowContent(supportedFonts, scaleFactor, window2, row, includeHidden, useCss) {
  var resultRow = new HtmlRowInput(row);
  for (var i = 0; i < row.cells.length; i++) {
    var cell = row.cells[i];
    var style_1 = window2.getComputedStyle(cell);
    if (includeHidden || style_1.display !== "none") {
      var cellStyles2 = void 0;
      if (useCss) {
        cellStyles2 = parseCss(supportedFonts, cell, scaleFactor, style_1, window2);
      }
      resultRow.push({
        rowSpan: cell.rowSpan,
        colSpan: cell.colSpan,
        styles: cellStyles2,
        _element: cell,
        content: parseCellContent(cell)
      });
    }
  }
  var style = window2.getComputedStyle(row);
  if (resultRow.length > 0 && (includeHidden || style.display !== "none")) {
    return resultRow;
  }
}
function parseCellContent(orgCell) {
  var cell = orgCell.cloneNode(true);
  cell.innerHTML = cell.innerHTML.replace(/\n/g, "").replace(/ +/g, " ");
  cell.innerHTML = cell.innerHTML.split(/<br.*?>/).map(function(part) {
    return part.trim();
  }).join("\n");
  return cell.innerText || cell.textContent || "";
}
function validateInput(global, document2, current) {
  for (var _i = 0, _a2 = [global, document2, current]; _i < _a2.length; _i++) {
    var options = _a2[_i];
    if (options && typeof options !== "object") {
      console.error("The options parameter should be of type object, is: " + typeof options);
    }
    if (options.startY && typeof options.startY !== "number") {
      console.error("Invalid value for startY option", options.startY);
      delete options.startY;
    }
  }
}
function assign(target, s, s1, s2, s3) {
  if (target == null) {
    throw new TypeError("Cannot convert undefined or null to object");
  }
  var to = Object(target);
  for (var index = 1; index < arguments.length; index++) {
    var nextSource = arguments[index];
    if (nextSource != null) {
      for (var nextKey in nextSource) {
        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
          to[nextKey] = nextSource[nextKey];
        }
      }
    }
  }
  return to;
}
function parseInput(d, current) {
  var doc = new DocHandler(d);
  var document2 = doc.getDocumentOptions();
  var global = doc.getGlobalOptions();
  validateInput(global, document2, current);
  var options = assign({}, global, document2, current);
  var win;
  if (typeof window !== "undefined") {
    win = window;
  }
  var styles = parseStyles(global, document2, current);
  var hooks = parseHooks(global, document2, current);
  var settings = parseSettings(doc, options);
  var content = parseContent$1(doc, options, win);
  return { id: current.tableId, content, hooks, styles, settings };
}
function parseStyles(gInput, dInput, cInput) {
  var styleOptions = {
    styles: {},
    headStyles: {},
    bodyStyles: {},
    footStyles: {},
    alternateRowStyles: {},
    columnStyles: {}
  };
  var _loop_1 = function(prop2) {
    if (prop2 === "columnStyles") {
      var global = gInput[prop2];
      var document_1 = dInput[prop2];
      var current = cInput[prop2];
      styleOptions.columnStyles = assign({}, global, document_1, current);
    } else {
      var allOptions = [gInput, dInput, cInput];
      var styles = allOptions.map(function(opts) {
        return opts[prop2] || {};
      });
      styleOptions[prop2] = assign({}, styles[0], styles[1], styles[2]);
    }
  };
  for (var _i = 0, _a2 = Object.keys(styleOptions); _i < _a2.length; _i++) {
    var prop = _a2[_i];
    _loop_1(prop);
  }
  return styleOptions;
}
function parseHooks(global, document2, current) {
  var allOptions = [global, document2, current];
  var result = {
    didParseCell: [],
    willDrawCell: [],
    didDrawCell: [],
    willDrawPage: [],
    didDrawPage: []
  };
  for (var _i = 0, allOptions_1 = allOptions; _i < allOptions_1.length; _i++) {
    var options = allOptions_1[_i];
    if (options.didParseCell)
      result.didParseCell.push(options.didParseCell);
    if (options.willDrawCell)
      result.willDrawCell.push(options.willDrawCell);
    if (options.didDrawCell)
      result.didDrawCell.push(options.didDrawCell);
    if (options.willDrawPage)
      result.willDrawPage.push(options.willDrawPage);
    if (options.didDrawPage)
      result.didDrawPage.push(options.didDrawPage);
  }
  return result;
}
function parseSettings(doc, options) {
  var _a2, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
  var margin = parseSpacing(options.margin, 40 / doc.scaleFactor());
  var startY = (_a2 = getStartY(doc, options.startY)) !== null && _a2 !== void 0 ? _a2 : margin.top;
  var showFoot;
  if (options.showFoot === true) {
    showFoot = "everyPage";
  } else if (options.showFoot === false) {
    showFoot = "never";
  } else {
    showFoot = (_b = options.showFoot) !== null && _b !== void 0 ? _b : "everyPage";
  }
  var showHead;
  if (options.showHead === true) {
    showHead = "everyPage";
  } else if (options.showHead === false) {
    showHead = "never";
  } else {
    showHead = (_c = options.showHead) !== null && _c !== void 0 ? _c : "everyPage";
  }
  var useCss = (_d = options.useCss) !== null && _d !== void 0 ? _d : false;
  var theme = options.theme || (useCss ? "plain" : "striped");
  var horizontalPageBreak = !!options.horizontalPageBreak;
  var horizontalPageBreakRepeat = (_e = options.horizontalPageBreakRepeat) !== null && _e !== void 0 ? _e : null;
  return {
    includeHiddenHtml: (_f = options.includeHiddenHtml) !== null && _f !== void 0 ? _f : false,
    useCss,
    theme,
    startY,
    margin,
    pageBreak: (_g = options.pageBreak) !== null && _g !== void 0 ? _g : "auto",
    rowPageBreak: (_h = options.rowPageBreak) !== null && _h !== void 0 ? _h : "auto",
    tableWidth: (_j = options.tableWidth) !== null && _j !== void 0 ? _j : "auto",
    showHead,
    showFoot,
    tableLineWidth: (_k = options.tableLineWidth) !== null && _k !== void 0 ? _k : 0,
    tableLineColor: (_l = options.tableLineColor) !== null && _l !== void 0 ? _l : 200,
    horizontalPageBreak,
    horizontalPageBreakRepeat,
    horizontalPageBreakBehaviour: (_m = options.horizontalPageBreakBehaviour) !== null && _m !== void 0 ? _m : "afterAllRows"
  };
}
function getStartY(doc, userStartY) {
  var previous = doc.getLastAutoTable();
  var sf = doc.scaleFactor();
  var currentPage = doc.pageNumber();
  var isSamePageAsPreviousTable = false;
  if (previous && previous.startPageNumber) {
    var endingPage = previous.startPageNumber + previous.pageNumber - 1;
    isSamePageAsPreviousTable = endingPage === currentPage;
  }
  if (typeof userStartY === "number") {
    return userStartY;
  } else if (userStartY == null || userStartY === false) {
    if (isSamePageAsPreviousTable && (previous === null || previous === void 0 ? void 0 : previous.finalY) != null) {
      return previous.finalY + 20 / sf;
    }
  }
  return null;
}
function parseContent$1(doc, options, window2) {
  var head = options.head || [];
  var body = options.body || [];
  var foot = options.foot || [];
  if (options.html) {
    var hidden = options.includeHiddenHtml;
    if (window2) {
      var htmlContent = parseHtml(doc, options.html, window2, hidden, options.useCss) || {};
      head = htmlContent.head || head;
      body = htmlContent.body || head;
      foot = htmlContent.foot || head;
    } else {
      console.error("Cannot parse html in non browser environment");
    }
  }
  var columns = options.columns || parseColumns(head, body, foot);
  return { columns, head, body, foot };
}
function parseColumns(head, body, foot) {
  var firstRow = head[0] || body[0] || foot[0] || [];
  var result = [];
  Object.keys(firstRow).filter(function(key) {
    return key !== "_element";
  }).forEach(function(key) {
    var colSpan = 1;
    var input;
    if (Array.isArray(firstRow)) {
      input = firstRow[parseInt(key)];
    } else {
      input = firstRow[key];
    }
    if (typeof input === "object" && !Array.isArray(input)) {
      colSpan = (input === null || input === void 0 ? void 0 : input.colSpan) || 1;
    }
    for (var i = 0; i < colSpan; i++) {
      var id = void 0;
      if (Array.isArray(firstRow)) {
        id = result.length;
      } else {
        id = key + (i > 0 ? "_".concat(i) : "");
      }
      var rowResult = { dataKey: id };
      result.push(rowResult);
    }
  });
  return result;
}
var HookData = (
  /** @class */
  /* @__PURE__ */ (function() {
    function HookData2(doc, table, cursor) {
      this.table = table;
      this.pageNumber = table.pageNumber;
      this.settings = table.settings;
      this.cursor = cursor;
      this.doc = doc.getDocument();
    }
    return HookData2;
  })()
);
var CellHookData = (
  /** @class */
  (function(_super) {
    __extends(CellHookData2, _super);
    function CellHookData2(doc, table, cell, row, column, cursor) {
      var _this = _super.call(this, doc, table, cursor) || this;
      _this.cell = cell;
      _this.row = row;
      _this.column = column;
      _this.section = row.section;
      return _this;
    }
    return CellHookData2;
  })(HookData)
);
var Table = (
  /** @class */
  (function() {
    function Table2(input, content) {
      this.pageNumber = 1;
      this.id = input.id;
      this.settings = input.settings;
      this.styles = input.styles;
      this.hooks = input.hooks;
      this.columns = content.columns;
      this.head = content.head;
      this.body = content.body;
      this.foot = content.foot;
    }
    Table2.prototype.getHeadHeight = function(columns) {
      return this.head.reduce(function(acc, row) {
        return acc + row.getMaxCellHeight(columns);
      }, 0);
    };
    Table2.prototype.getFootHeight = function(columns) {
      return this.foot.reduce(function(acc, row) {
        return acc + row.getMaxCellHeight(columns);
      }, 0);
    };
    Table2.prototype.allRows = function() {
      return this.head.concat(this.body).concat(this.foot);
    };
    Table2.prototype.callCellHooks = function(doc, handlers, cell, row, column, cursor) {
      for (var _i = 0, handlers_1 = handlers; _i < handlers_1.length; _i++) {
        var handler = handlers_1[_i];
        var data = new CellHookData(doc, this, cell, row, column, cursor);
        var result = handler(data) === false;
        cell.text = Array.isArray(cell.text) ? cell.text : [cell.text];
        if (result) {
          return false;
        }
      }
      return true;
    };
    Table2.prototype.callEndPageHooks = function(doc, cursor) {
      doc.applyStyles(doc.userStyles);
      for (var _i = 0, _a2 = this.hooks.didDrawPage; _i < _a2.length; _i++) {
        var handler = _a2[_i];
        handler(new HookData(doc, this, cursor));
      }
    };
    Table2.prototype.callWillDrawPageHooks = function(doc, cursor) {
      for (var _i = 0, _a2 = this.hooks.willDrawPage; _i < _a2.length; _i++) {
        var handler = _a2[_i];
        handler(new HookData(doc, this, cursor));
      }
    };
    Table2.prototype.getWidth = function(pageWidth) {
      if (typeof this.settings.tableWidth === "number") {
        return this.settings.tableWidth;
      } else if (this.settings.tableWidth === "wrap") {
        var wrappedWidth = this.columns.reduce(function(total, col) {
          return total + col.wrappedWidth;
        }, 0);
        return wrappedWidth;
      } else {
        var margin = this.settings.margin;
        return pageWidth - margin.left - margin.right;
      }
    };
    return Table2;
  })()
);
var Row = (
  /** @class */
  (function() {
    function Row2(raw, index, section, cells, spansMultiplePages) {
      if (spansMultiplePages === void 0) {
        spansMultiplePages = false;
      }
      this.height = 0;
      this.raw = raw;
      if (raw instanceof HtmlRowInput) {
        this.raw = raw._element;
        this.element = raw._element;
      }
      this.index = index;
      this.section = section;
      this.cells = cells;
      this.spansMultiplePages = spansMultiplePages;
    }
    Row2.prototype.getMaxCellHeight = function(columns) {
      var _this = this;
      return columns.reduce(function(acc, column) {
        var _a2;
        return Math.max(acc, ((_a2 = _this.cells[column.index]) === null || _a2 === void 0 ? void 0 : _a2.height) || 0);
      }, 0);
    };
    Row2.prototype.hasRowSpan = function(columns) {
      var _this = this;
      return columns.filter(function(column) {
        var cell = _this.cells[column.index];
        if (!cell)
          return false;
        return cell.rowSpan > 1;
      }).length > 0;
    };
    Row2.prototype.canEntireRowFit = function(height, columns) {
      return this.getMaxCellHeight(columns) <= height;
    };
    Row2.prototype.getMinimumRowHeight = function(columns, doc) {
      var _this = this;
      return columns.reduce(function(acc, column) {
        var cell = _this.cells[column.index];
        if (!cell)
          return 0;
        var lineHeight = doc.getLineHeight(cell.styles.fontSize);
        var vPadding = cell.padding("vertical");
        var oneRowHeight = vPadding + lineHeight;
        return oneRowHeight > acc ? oneRowHeight : acc;
      }, 0);
    };
    return Row2;
  })()
);
var Cell = (
  /** @class */
  (function() {
    function Cell2(raw, styles, section) {
      var _a2;
      this.contentHeight = 0;
      this.contentWidth = 0;
      this.wrappedWidth = 0;
      this.minReadableWidth = 0;
      this.minWidth = 0;
      this.width = 0;
      this.height = 0;
      this.x = 0;
      this.y = 0;
      this.styles = styles;
      this.section = section;
      this.raw = raw;
      var content = raw;
      if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
        this.rowSpan = raw.rowSpan || 1;
        this.colSpan = raw.colSpan || 1;
        content = (_a2 = raw.content) !== null && _a2 !== void 0 ? _a2 : raw;
        if (raw._element) {
          this.raw = raw._element;
        }
      } else {
        this.rowSpan = 1;
        this.colSpan = 1;
      }
      var text = content != null ? "" + content : "";
      var splitRegex = /\r\n|\r|\n/g;
      this.text = text.split(splitRegex);
    }
    Cell2.prototype.getTextPos = function() {
      var y;
      if (this.styles.valign === "top") {
        y = this.y + this.padding("top");
      } else if (this.styles.valign === "bottom") {
        y = this.y + this.height - this.padding("bottom");
      } else {
        var netHeight = this.height - this.padding("vertical");
        y = this.y + netHeight / 2 + this.padding("top");
      }
      var x;
      if (this.styles.halign === "right") {
        x = this.x + this.width - this.padding("right");
      } else if (this.styles.halign === "center") {
        var netWidth = this.width - this.padding("horizontal");
        x = this.x + netWidth / 2 + this.padding("left");
      } else {
        x = this.x + this.padding("left");
      }
      return { x, y };
    };
    Cell2.prototype.getContentHeight = function(scaleFactor, lineHeightFactor) {
      if (lineHeightFactor === void 0) {
        lineHeightFactor = 1.15;
      }
      var lineCount = Array.isArray(this.text) ? this.text.length : 1;
      var lineHeight = this.styles.fontSize / scaleFactor * lineHeightFactor;
      var height = lineCount * lineHeight + this.padding("vertical");
      return Math.max(height, this.styles.minCellHeight);
    };
    Cell2.prototype.padding = function(name) {
      var padding = parseSpacing(this.styles.cellPadding, 0);
      if (name === "vertical") {
        return padding.top + padding.bottom;
      } else if (name === "horizontal") {
        return padding.left + padding.right;
      } else {
        return padding[name];
      }
    };
    return Cell2;
  })()
);
var Column = (
  /** @class */
  (function() {
    function Column2(dataKey, raw, index) {
      this.wrappedWidth = 0;
      this.minReadableWidth = 0;
      this.minWidth = 0;
      this.width = 0;
      this.dataKey = dataKey;
      this.raw = raw;
      this.index = index;
    }
    Column2.prototype.getMaxCustomCellWidth = function(table) {
      var max = 0;
      for (var _i = 0, _a2 = table.allRows(); _i < _a2.length; _i++) {
        var row = _a2[_i];
        var cell = row.cells[this.index];
        if (cell && typeof cell.styles.cellWidth === "number") {
          max = Math.max(max, cell.styles.cellWidth);
        }
      }
      return max;
    };
    return Column2;
  })()
);
function calculateWidths(doc, table) {
  calculate(doc, table);
  var resizableColumns = [];
  var initialTableWidth = 0;
  table.columns.forEach(function(column) {
    var customWidth = column.getMaxCustomCellWidth(table);
    if (customWidth) {
      column.width = customWidth;
    } else {
      column.width = column.wrappedWidth;
      resizableColumns.push(column);
    }
    initialTableWidth += column.width;
  });
  var resizeWidth = table.getWidth(doc.pageSize().width) - initialTableWidth;
  if (resizeWidth) {
    resizeWidth = resizeColumns(resizableColumns, resizeWidth, function(column) {
      return Math.max(column.minReadableWidth, column.minWidth);
    });
  }
  if (resizeWidth) {
    resizeWidth = resizeColumns(resizableColumns, resizeWidth, function(column) {
      return column.minWidth;
    });
  }
  resizeWidth = Math.abs(resizeWidth);
  if (!table.settings.horizontalPageBreak && resizeWidth > 0.1 / doc.scaleFactor()) {
    resizeWidth = resizeWidth < 1 ? resizeWidth : Math.round(resizeWidth);
    console.log("Of the table content, ".concat(resizeWidth, " units width could not fit page"));
  }
  applyColSpans(table);
  fitContent(table, doc);
  applyRowSpans(table);
}
function calculate(doc, table) {
  var sf = doc.scaleFactor();
  var horizontalPageBreak = table.settings.horizontalPageBreak;
  var availablePageWidth = getPageAvailableWidth(doc, table);
  table.allRows().forEach(function(row) {
    for (var _i = 0, _a2 = table.columns; _i < _a2.length; _i++) {
      var column = _a2[_i];
      var cell = row.cells[column.index];
      if (!cell)
        continue;
      var hooks = table.hooks.didParseCell;
      table.callCellHooks(doc, hooks, cell, row, column, null);
      var padding = cell.padding("horizontal");
      cell.contentWidth = getStringWidth(cell.text, cell.styles, doc) + padding;
      var longestWordWidth = getStringWidth(cell.text.join(" ").split(/[^\S\u00A0]+/), cell.styles, doc);
      cell.minReadableWidth = longestWordWidth + cell.padding("horizontal");
      if (typeof cell.styles.cellWidth === "number") {
        cell.minWidth = cell.styles.cellWidth;
        cell.wrappedWidth = cell.styles.cellWidth;
      } else if (cell.styles.cellWidth === "wrap" || horizontalPageBreak === true) {
        if (cell.contentWidth > availablePageWidth) {
          cell.minWidth = availablePageWidth;
          cell.wrappedWidth = availablePageWidth;
        } else {
          cell.minWidth = cell.contentWidth;
          cell.wrappedWidth = cell.contentWidth;
        }
      } else {
        var defaultMinWidth = 10 / sf;
        cell.minWidth = cell.styles.minCellWidth || defaultMinWidth;
        cell.wrappedWidth = cell.contentWidth;
        if (cell.minWidth > cell.wrappedWidth) {
          cell.wrappedWidth = cell.minWidth;
        }
      }
    }
  });
  table.allRows().forEach(function(row) {
    for (var _i = 0, _a2 = table.columns; _i < _a2.length; _i++) {
      var column = _a2[_i];
      var cell = row.cells[column.index];
      if (cell && cell.colSpan === 1) {
        column.wrappedWidth = Math.max(column.wrappedWidth, cell.wrappedWidth);
        column.minWidth = Math.max(column.minWidth, cell.minWidth);
        column.minReadableWidth = Math.max(column.minReadableWidth, cell.minReadableWidth);
      } else {
        var columnStyles = table.styles.columnStyles[column.dataKey] || table.styles.columnStyles[column.index] || {};
        var cellWidth = columnStyles.cellWidth || columnStyles.minCellWidth;
        if (cellWidth && typeof cellWidth === "number") {
          column.minWidth = cellWidth;
          column.wrappedWidth = cellWidth;
        }
      }
      if (cell) {
        if (cell.colSpan > 1 && !column.minWidth) {
          column.minWidth = cell.minWidth;
        }
        if (cell.colSpan > 1 && !column.wrappedWidth) {
          column.wrappedWidth = cell.minWidth;
        }
      }
    }
  });
}
function resizeColumns(columns, resizeWidth, getMinWidth) {
  var initialResizeWidth = resizeWidth;
  var sumWrappedWidth = columns.reduce(function(acc, column2) {
    return acc + column2.wrappedWidth;
  }, 0);
  for (var i = 0; i < columns.length; i++) {
    var column = columns[i];
    var ratio = column.wrappedWidth / sumWrappedWidth;
    var suggestedChange = initialResizeWidth * ratio;
    var suggestedWidth = column.width + suggestedChange;
    var minWidth = getMinWidth(column);
    var newWidth = suggestedWidth < minWidth ? minWidth : suggestedWidth;
    resizeWidth -= newWidth - column.width;
    column.width = newWidth;
  }
  resizeWidth = Math.round(resizeWidth * 1e10) / 1e10;
  if (resizeWidth) {
    var resizableColumns = columns.filter(function(column2) {
      return resizeWidth < 0 ? column2.width > getMinWidth(column2) : true;
    });
    if (resizableColumns.length) {
      resizeWidth = resizeColumns(resizableColumns, resizeWidth, getMinWidth);
    }
  }
  return resizeWidth;
}
function applyRowSpans(table) {
  var rowSpanCells = {};
  var colRowSpansLeft = 1;
  var all = table.allRows();
  for (var rowIndex = 0; rowIndex < all.length; rowIndex++) {
    var row = all[rowIndex];
    for (var _i = 0, _a2 = table.columns; _i < _a2.length; _i++) {
      var column = _a2[_i];
      var data = rowSpanCells[column.index];
      if (colRowSpansLeft > 1) {
        colRowSpansLeft--;
        delete row.cells[column.index];
      } else if (data) {
        data.cell.height += row.height;
        colRowSpansLeft = data.cell.colSpan;
        delete row.cells[column.index];
        data.left--;
        if (data.left <= 1) {
          delete rowSpanCells[column.index];
        }
      } else {
        var cell = row.cells[column.index];
        if (!cell) {
          continue;
        }
        cell.height = row.height;
        if (cell.rowSpan > 1) {
          var remaining = all.length - rowIndex;
          var left = cell.rowSpan > remaining ? remaining : cell.rowSpan;
          rowSpanCells[column.index] = { cell, left, row };
        }
      }
    }
  }
}
function applyColSpans(table) {
  var all = table.allRows();
  for (var rowIndex = 0; rowIndex < all.length; rowIndex++) {
    var row = all[rowIndex];
    var colSpanCell = null;
    var combinedColSpanWidth = 0;
    var colSpansLeft = 0;
    for (var columnIndex = 0; columnIndex < table.columns.length; columnIndex++) {
      var column = table.columns[columnIndex];
      colSpansLeft -= 1;
      if (colSpansLeft > 1 && table.columns[columnIndex + 1]) {
        combinedColSpanWidth += column.width;
        delete row.cells[column.index];
      } else if (colSpanCell) {
        var cell = colSpanCell;
        delete row.cells[column.index];
        colSpanCell = null;
        cell.width = column.width + combinedColSpanWidth;
      } else {
        var cell = row.cells[column.index];
        if (!cell)
          continue;
        colSpansLeft = cell.colSpan;
        combinedColSpanWidth = 0;
        if (cell.colSpan > 1) {
          colSpanCell = cell;
          combinedColSpanWidth += column.width;
          continue;
        }
        cell.width = column.width + combinedColSpanWidth;
      }
    }
  }
}
function fitContent(table, doc) {
  var rowSpanHeight = { count: 0, height: 0 };
  for (var _i = 0, _a2 = table.allRows(); _i < _a2.length; _i++) {
    var row = _a2[_i];
    for (var _b = 0, _c = table.columns; _b < _c.length; _b++) {
      var column = _c[_b];
      var cell = row.cells[column.index];
      if (!cell)
        continue;
      doc.applyStyles(cell.styles, true);
      var textSpace = cell.width - cell.padding("horizontal");
      if (cell.styles.overflow === "linebreak") {
        cell.text = doc.splitTextToSize(cell.text, textSpace + 1 / doc.scaleFactor(), { fontSize: cell.styles.fontSize });
      } else if (cell.styles.overflow === "ellipsize") {
        cell.text = ellipsize(cell.text, textSpace, cell.styles, doc, "...");
      } else if (cell.styles.overflow === "hidden") {
        cell.text = ellipsize(cell.text, textSpace, cell.styles, doc, "");
      } else if (typeof cell.styles.overflow === "function") {
        var result = cell.styles.overflow(cell.text, textSpace);
        if (typeof result === "string") {
          cell.text = [result];
        } else {
          cell.text = result;
        }
      }
      cell.contentHeight = cell.getContentHeight(doc.scaleFactor(), doc.getLineHeightFactor());
      var realContentHeight = cell.contentHeight / cell.rowSpan;
      if (cell.rowSpan > 1 && rowSpanHeight.count * rowSpanHeight.height < realContentHeight * cell.rowSpan) {
        rowSpanHeight = { height: realContentHeight, count: cell.rowSpan };
      } else if (rowSpanHeight && rowSpanHeight.count > 0) {
        if (rowSpanHeight.height > realContentHeight) {
          realContentHeight = rowSpanHeight.height;
        }
      }
      if (realContentHeight > row.height) {
        row.height = realContentHeight;
      }
    }
    rowSpanHeight.count--;
  }
}
function ellipsize(text, width, styles, doc, overflow) {
  return text.map(function(str) {
    return ellipsizeStr(str, width, styles, doc, overflow);
  });
}
function ellipsizeStr(text, width, styles, doc, overflow) {
  var precision = 1e4 * doc.scaleFactor();
  width = Math.ceil(width * precision) / precision;
  if (width >= getStringWidth(text, styles, doc)) {
    return text;
  }
  while (width < getStringWidth(text + overflow, styles, doc)) {
    if (text.length <= 1) {
      break;
    }
    text = text.substring(0, text.length - 1);
  }
  return text.trim() + overflow;
}
function createTable(jsPDFDoc, input) {
  var doc = new DocHandler(jsPDFDoc);
  var content = parseContent(input, doc.scaleFactor());
  var table = new Table(input, content);
  calculateWidths(doc, table);
  doc.applyStyles(doc.userStyles);
  return table;
}
function parseContent(input, sf) {
  var content = input.content;
  var columns = createColumns(content.columns);
  if (content.head.length === 0) {
    var sectionRow = generateSectionRow(columns, "head");
    if (sectionRow)
      content.head.push(sectionRow);
  }
  if (content.foot.length === 0) {
    var sectionRow = generateSectionRow(columns, "foot");
    if (sectionRow)
      content.foot.push(sectionRow);
  }
  var theme = input.settings.theme;
  var styles = input.styles;
  return {
    columns,
    head: parseSection("head", content.head, columns, styles, theme, sf),
    body: parseSection("body", content.body, columns, styles, theme, sf),
    foot: parseSection("foot", content.foot, columns, styles, theme, sf)
  };
}
function parseSection(sectionName, sectionRows, columns, styleProps, theme, scaleFactor) {
  var rowSpansLeftForColumn = {};
  var result = sectionRows.map(function(rawRow, rowIndex) {
    var skippedRowForRowSpans = 0;
    var cells = {};
    var colSpansAdded = 0;
    var columnSpansLeft = 0;
    for (var _i = 0, columns_1 = columns; _i < columns_1.length; _i++) {
      var column = columns_1[_i];
      if (rowSpansLeftForColumn[column.index] == null || rowSpansLeftForColumn[column.index].left === 0) {
        if (columnSpansLeft === 0) {
          var rawCell = void 0;
          if (Array.isArray(rawRow)) {
            rawCell = rawRow[column.index - colSpansAdded - skippedRowForRowSpans];
          } else {
            rawCell = rawRow[column.dataKey];
          }
          var cellInputStyles = {};
          if (typeof rawCell === "object" && !Array.isArray(rawCell)) {
            cellInputStyles = (rawCell === null || rawCell === void 0 ? void 0 : rawCell.styles) || {};
          }
          var styles = cellStyles(sectionName, column, rowIndex, theme, styleProps, scaleFactor, cellInputStyles);
          var cell = new Cell(rawCell, styles, sectionName);
          cells[column.dataKey] = cell;
          cells[column.index] = cell;
          columnSpansLeft = cell.colSpan - 1;
          rowSpansLeftForColumn[column.index] = {
            left: cell.rowSpan - 1,
            times: columnSpansLeft
          };
        } else {
          columnSpansLeft--;
          colSpansAdded++;
        }
      } else {
        rowSpansLeftForColumn[column.index].left--;
        columnSpansLeft = rowSpansLeftForColumn[column.index].times;
        skippedRowForRowSpans++;
      }
    }
    return new Row(rawRow, rowIndex, sectionName, cells);
  });
  return result;
}
function generateSectionRow(columns, section) {
  var sectionRow = {};
  columns.forEach(function(col) {
    if (col.raw != null) {
      var title = getSectionTitle(section, col.raw);
      if (title != null)
        sectionRow[col.dataKey] = title;
    }
  });
  return Object.keys(sectionRow).length > 0 ? sectionRow : null;
}
function getSectionTitle(section, column) {
  if (section === "head") {
    if (typeof column === "object") {
      return column.header || null;
    } else if (typeof column === "string" || typeof column === "number") {
      return column;
    }
  } else if (section === "foot" && typeof column === "object") {
    return column.footer;
  }
  return null;
}
function createColumns(columns) {
  return columns.map(function(input, index) {
    var _a2;
    var key;
    if (typeof input === "object") {
      key = (_a2 = input.dataKey) !== null && _a2 !== void 0 ? _a2 : index;
    } else {
      key = index;
    }
    return new Column(key, input, index);
  });
}
function cellStyles(sectionName, column, rowIndex, themeName, styles, scaleFactor, cellInputStyles) {
  var theme = getTheme(themeName);
  var sectionStyles;
  if (sectionName === "head") {
    sectionStyles = styles.headStyles;
  } else if (sectionName === "body") {
    sectionStyles = styles.bodyStyles;
  } else if (sectionName === "foot") {
    sectionStyles = styles.footStyles;
  }
  var otherStyles = assign({}, theme.table, theme[sectionName], styles.styles, sectionStyles);
  var columnStyles = styles.columnStyles[column.dataKey] || styles.columnStyles[column.index] || {};
  var colStyles = sectionName === "body" ? columnStyles : {};
  var rowStyles = sectionName === "body" && rowIndex % 2 === 0 ? assign({}, theme.alternateRow, styles.alternateRowStyles) : {};
  var defaultStyle = defaultStyles(scaleFactor);
  var themeStyles = assign({}, defaultStyle, otherStyles, rowStyles, colStyles);
  return assign(themeStyles, cellInputStyles);
}
function getColumnsCanFitInPage(doc, table, config) {
  var _a2;
  if (config === void 0) {
    config = {};
  }
  var remainingWidth = getPageAvailableWidth(doc, table);
  var repeatColumnsMap = /* @__PURE__ */ new Map();
  var colIndexes = [];
  var columns = [];
  var horizontalPageBreakRepeat = [];
  if (Array.isArray(table.settings.horizontalPageBreakRepeat)) {
    horizontalPageBreakRepeat = table.settings.horizontalPageBreakRepeat;
  } else if (typeof table.settings.horizontalPageBreakRepeat === "string" || typeof table.settings.horizontalPageBreakRepeat === "number") {
    horizontalPageBreakRepeat = [table.settings.horizontalPageBreakRepeat];
  }
  horizontalPageBreakRepeat.forEach(function(field) {
    var col = table.columns.find(function(item) {
      return item.dataKey === field || item.index === field;
    });
    if (col && !repeatColumnsMap.has(col.index)) {
      repeatColumnsMap.set(col.index, true);
      colIndexes.push(col.index);
      columns.push(table.columns[col.index]);
      remainingWidth -= col.wrappedWidth;
    }
  });
  var first = true;
  var i = (_a2 = config === null || config === void 0 ? void 0 : config.start) !== null && _a2 !== void 0 ? _a2 : 0;
  while (i < table.columns.length) {
    if (repeatColumnsMap.has(i)) {
      i++;
      continue;
    }
    var colWidth = table.columns[i].wrappedWidth;
    if (first || remainingWidth >= colWidth) {
      first = false;
      colIndexes.push(i);
      columns.push(table.columns[i]);
      remainingWidth -= colWidth;
    } else {
      break;
    }
    i++;
  }
  return { colIndexes, columns, lastIndex: i - 1 };
}
function calculateAllColumnsCanFitInPage(doc, table) {
  var allResults = [];
  for (var i = 0; i < table.columns.length; i++) {
    var result = getColumnsCanFitInPage(doc, table, { start: i });
    if (result.columns.length) {
      allResults.push(result);
      i = result.lastIndex;
    }
  }
  return allResults;
}
function drawTable(jsPDFDoc, table) {
  var settings = table.settings;
  var startY = settings.startY;
  var margin = settings.margin;
  var cursor = { x: margin.left, y: startY };
  var sectionsHeight = table.getHeadHeight(table.columns) + table.getFootHeight(table.columns);
  var minTableBottomPos = startY + margin.bottom + sectionsHeight;
  if (settings.pageBreak === "avoid") {
    var rows = table.body;
    var tableHeight = rows.reduce(function(acc, row) {
      return acc + row.height;
    }, 0);
    minTableBottomPos += tableHeight;
  }
  var doc = new DocHandler(jsPDFDoc);
  if (settings.pageBreak === "always" || settings.startY != null && minTableBottomPos > doc.pageSize().height) {
    nextPage(doc);
    cursor.y = margin.top;
  }
  table.callWillDrawPageHooks(doc, cursor);
  var startPos = assign({}, cursor);
  table.startPageNumber = doc.pageNumber();
  if (settings.horizontalPageBreak) {
    printTableWithHorizontalPageBreak(doc, table, startPos, cursor);
  } else {
    doc.applyStyles(doc.userStyles);
    if (settings.showHead === "firstPage" || settings.showHead === "everyPage") {
      table.head.forEach(function(row) {
        return printRow(doc, table, row, cursor, table.columns);
      });
    }
    doc.applyStyles(doc.userStyles);
    table.body.forEach(function(row, index) {
      var isLastRow = index === table.body.length - 1;
      printFullRow(doc, table, row, isLastRow, startPos, cursor, table.columns);
    });
    doc.applyStyles(doc.userStyles);
    if (settings.showFoot === "lastPage" || settings.showFoot === "everyPage") {
      table.foot.forEach(function(row) {
        return printRow(doc, table, row, cursor, table.columns);
      });
    }
  }
  addTableBorder(doc, table, startPos, cursor);
  table.callEndPageHooks(doc, cursor);
  table.finalY = cursor.y;
  jsPDFDoc.lastAutoTable = table;
  doc.applyStyles(doc.userStyles);
}
function printTableWithHorizontalPageBreak(doc, table, startPos, cursor) {
  var allColumnsCanFitResult = calculateAllColumnsCanFitInPage(doc, table);
  var settings = table.settings;
  if (settings.horizontalPageBreakBehaviour === "afterAllRows") {
    allColumnsCanFitResult.forEach(function(colsAndIndexes, index) {
      doc.applyStyles(doc.userStyles);
      if (index > 0) {
        addPage(doc, table, startPos, cursor, colsAndIndexes.columns, true);
      } else {
        printHead(doc, table, cursor, colsAndIndexes.columns);
      }
      printBody(doc, table, startPos, cursor, colsAndIndexes.columns);
      printFoot(doc, table, cursor, colsAndIndexes.columns);
    });
  } else {
    var lastRowIndexOfLastPage_1 = -1;
    var firstColumnsToFitResult = allColumnsCanFitResult[0];
    var _loop_1 = function() {
      var lastPrintedRowIndex = lastRowIndexOfLastPage_1;
      if (firstColumnsToFitResult) {
        doc.applyStyles(doc.userStyles);
        var firstColumnsToFit = firstColumnsToFitResult.columns;
        if (lastRowIndexOfLastPage_1 >= 0) {
          addPage(doc, table, startPos, cursor, firstColumnsToFit, true);
        } else {
          printHead(doc, table, cursor, firstColumnsToFit);
        }
        lastPrintedRowIndex = printBodyWithoutPageBreaks(doc, table, lastRowIndexOfLastPage_1 + 1, cursor, firstColumnsToFit);
        printFoot(doc, table, cursor, firstColumnsToFit);
      }
      var maxNumberOfRows = lastPrintedRowIndex - lastRowIndexOfLastPage_1;
      allColumnsCanFitResult.slice(1).forEach(function(colsAndIndexes) {
        doc.applyStyles(doc.userStyles);
        addPage(doc, table, startPos, cursor, colsAndIndexes.columns, true);
        printBodyWithoutPageBreaks(doc, table, lastRowIndexOfLastPage_1 + 1, cursor, colsAndIndexes.columns, maxNumberOfRows);
        printFoot(doc, table, cursor, colsAndIndexes.columns);
      });
      lastRowIndexOfLastPage_1 = lastPrintedRowIndex;
    };
    while (lastRowIndexOfLastPage_1 < table.body.length - 1) {
      _loop_1();
    }
  }
}
function printHead(doc, table, cursor, columns) {
  var settings = table.settings;
  doc.applyStyles(doc.userStyles);
  if (settings.showHead === "firstPage" || settings.showHead === "everyPage") {
    table.head.forEach(function(row) {
      return printRow(doc, table, row, cursor, columns);
    });
  }
}
function printBody(doc, table, startPos, cursor, columns) {
  doc.applyStyles(doc.userStyles);
  table.body.forEach(function(row, index) {
    var isLastRow = index === table.body.length - 1;
    printFullRow(doc, table, row, isLastRow, startPos, cursor, columns);
  });
}
function printBodyWithoutPageBreaks(doc, table, startRowIndex, cursor, columns, maxNumberOfRows) {
  doc.applyStyles(doc.userStyles);
  maxNumberOfRows = maxNumberOfRows !== null && maxNumberOfRows !== void 0 ? maxNumberOfRows : table.body.length;
  var endRowIndex = Math.min(startRowIndex + maxNumberOfRows, table.body.length);
  var lastPrintedRowIndex = -1;
  var rows = table.body.slice(startRowIndex, endRowIndex);
  for (var index = 0; index < rows.length; index++) {
    var row = rows[index];
    var isLastRow = startRowIndex + index === table.body.length - 1;
    var remainingSpace = getRemainingPageSpace(doc, table, isLastRow, cursor);
    if (row.canEntireRowFit(remainingSpace, columns)) {
      printRow(doc, table, row, cursor, columns);
      lastPrintedRowIndex = startRowIndex + index;
    } else {
      break;
    }
  }
  return lastPrintedRowIndex;
}
function printFoot(doc, table, cursor, columns) {
  var settings = table.settings;
  doc.applyStyles(doc.userStyles);
  if (settings.showFoot === "lastPage" || settings.showFoot === "everyPage") {
    table.foot.forEach(function(row) {
      return printRow(doc, table, row, cursor, columns);
    });
  }
}
function getRemainingLineCount(cell, remainingPageSpace, doc) {
  var lineHeight = doc.getLineHeight(cell.styles.fontSize);
  var vPadding = cell.padding("vertical");
  var remainingLines = Math.floor((remainingPageSpace - vPadding) / lineHeight);
  return Math.max(0, remainingLines);
}
function modifyRowToFit(row, remainingPageSpace, table, doc) {
  var cells = {};
  row.spansMultiplePages = true;
  row.height = 0;
  var rowHeight = 0;
  for (var _i = 0, _a2 = table.columns; _i < _a2.length; _i++) {
    var column = _a2[_i];
    var cell = row.cells[column.index];
    if (!cell)
      continue;
    if (!Array.isArray(cell.text)) {
      cell.text = [cell.text];
    }
    var remainderCell = new Cell(cell.raw, cell.styles, cell.section);
    remainderCell = assign(remainderCell, cell);
    remainderCell.text = [];
    var remainingLineCount = getRemainingLineCount(cell, remainingPageSpace, doc);
    if (cell.text.length > remainingLineCount) {
      remainderCell.text = cell.text.splice(remainingLineCount, cell.text.length);
    }
    var scaleFactor = doc.scaleFactor();
    var lineHeightFactor = doc.getLineHeightFactor();
    cell.contentHeight = cell.getContentHeight(scaleFactor, lineHeightFactor);
    if (cell.contentHeight >= remainingPageSpace) {
      cell.contentHeight = remainingPageSpace;
      remainderCell.styles.minCellHeight -= remainingPageSpace;
    }
    if (cell.contentHeight > row.height) {
      row.height = cell.contentHeight;
    }
    remainderCell.contentHeight = remainderCell.getContentHeight(scaleFactor, lineHeightFactor);
    if (remainderCell.contentHeight > rowHeight) {
      rowHeight = remainderCell.contentHeight;
    }
    cells[column.index] = remainderCell;
  }
  var remainderRow = new Row(row.raw, -1, row.section, cells, true);
  remainderRow.height = rowHeight;
  for (var _b = 0, _c = table.columns; _b < _c.length; _b++) {
    var column = _c[_b];
    var remainderCell = remainderRow.cells[column.index];
    if (remainderCell) {
      remainderCell.height = remainderRow.height;
    }
    var cell = row.cells[column.index];
    if (cell) {
      cell.height = row.height;
    }
  }
  return remainderRow;
}
function shouldPrintOnCurrentPage(doc, row, remainingPageSpace, table) {
  var pageHeight = doc.pageSize().height;
  var margin = table.settings.margin;
  var marginHeight = margin.top + margin.bottom;
  var maxRowHeight = pageHeight - marginHeight;
  if (row.section === "body") {
    maxRowHeight -= table.getHeadHeight(table.columns) + table.getFootHeight(table.columns);
  }
  var minRowHeight = row.getMinimumRowHeight(table.columns, doc);
  var minRowFits = minRowHeight < remainingPageSpace;
  if (minRowHeight > maxRowHeight) {
    console.log("Will not be able to print row ".concat(row.index, " correctly since it's minimum height is larger than page height"));
    return true;
  }
  if (!minRowFits) {
    return false;
  }
  var rowHasRowSpanCell = row.hasRowSpan(table.columns);
  var rowHigherThanPage = row.getMaxCellHeight(table.columns) > maxRowHeight;
  if (rowHigherThanPage) {
    if (rowHasRowSpanCell) {
      console.log("The content of row ".concat(row.index, " will not be drawn correctly since drawing rows with a height larger than the page height and has cells with rowspans is not supported."));
    }
    return true;
  }
  if (rowHasRowSpanCell) {
    return false;
  }
  if (table.settings.rowPageBreak === "avoid") {
    return false;
  }
  return true;
}
function printFullRow(doc, table, row, isLastRow, startPos, cursor, columns) {
  var remainingSpace = getRemainingPageSpace(doc, table, isLastRow, cursor);
  if (row.canEntireRowFit(remainingSpace, columns)) {
    printRow(doc, table, row, cursor, columns);
  } else if (shouldPrintOnCurrentPage(doc, row, remainingSpace, table)) {
    var remainderRow = modifyRowToFit(row, remainingSpace, table, doc);
    printRow(doc, table, row, cursor, columns);
    addPage(doc, table, startPos, cursor, columns);
    printFullRow(doc, table, remainderRow, isLastRow, startPos, cursor, columns);
  } else {
    addPage(doc, table, startPos, cursor, columns);
    printFullRow(doc, table, row, isLastRow, startPos, cursor, columns);
  }
}
function printRow(doc, table, row, cursor, columns) {
  cursor.x = table.settings.margin.left;
  for (var _i = 0, columns_1 = columns; _i < columns_1.length; _i++) {
    var column = columns_1[_i];
    var cell = row.cells[column.index];
    if (!cell) {
      cursor.x += column.width;
      continue;
    }
    doc.applyStyles(cell.styles);
    cell.x = cursor.x;
    cell.y = cursor.y;
    var result = table.callCellHooks(doc, table.hooks.willDrawCell, cell, row, column, cursor);
    if (result === false) {
      cursor.x += column.width;
      continue;
    }
    drawCellRect(doc, cell, cursor);
    var textPos = cell.getTextPos();
    autoTableText(cell.text, textPos.x, textPos.y, {
      halign: cell.styles.halign,
      valign: cell.styles.valign,
      maxWidth: Math.ceil(cell.width - cell.padding("left") - cell.padding("right")),
      textOptions: cell.styles.textOptions
    }, doc.getDocument());
    table.callCellHooks(doc, table.hooks.didDrawCell, cell, row, column, cursor);
    cursor.x += column.width;
  }
  cursor.y += row.height;
}
function drawCellRect(doc, cell, cursor) {
  var cellStyles2 = cell.styles;
  doc.getDocument().setFillColor(doc.getDocument().getFillColor());
  if (typeof cellStyles2.lineWidth === "number") {
    var fillStyle = getFillStyle(cellStyles2.lineWidth, cellStyles2.fillColor);
    if (fillStyle) {
      doc.rect(cell.x, cursor.y, cell.width, cell.height, fillStyle);
    }
  } else if (typeof cellStyles2.lineWidth === "object") {
    if (cellStyles2.fillColor) {
      doc.rect(cell.x, cursor.y, cell.width, cell.height, "F");
    }
    drawCellBorders(doc, cell, cursor, cellStyles2.lineWidth);
  }
}
function drawCellBorders(doc, cell, cursor, lineWidth) {
  var x1, y1, x2, y2;
  if (lineWidth.top) {
    x1 = cursor.x;
    y1 = cursor.y;
    x2 = cursor.x + cell.width;
    y2 = cursor.y;
    if (lineWidth.right) {
      x2 += 0.5 * lineWidth.right;
    }
    if (lineWidth.left) {
      x1 -= 0.5 * lineWidth.left;
    }
    drawLine(lineWidth.top, x1, y1, x2, y2);
  }
  if (lineWidth.bottom) {
    x1 = cursor.x;
    y1 = cursor.y + cell.height;
    x2 = cursor.x + cell.width;
    y2 = cursor.y + cell.height;
    if (lineWidth.right) {
      x2 += 0.5 * lineWidth.right;
    }
    if (lineWidth.left) {
      x1 -= 0.5 * lineWidth.left;
    }
    drawLine(lineWidth.bottom, x1, y1, x2, y2);
  }
  if (lineWidth.left) {
    x1 = cursor.x;
    y1 = cursor.y;
    x2 = cursor.x;
    y2 = cursor.y + cell.height;
    if (lineWidth.top) {
      y1 -= 0.5 * lineWidth.top;
    }
    if (lineWidth.bottom) {
      y2 += 0.5 * lineWidth.bottom;
    }
    drawLine(lineWidth.left, x1, y1, x2, y2);
  }
  if (lineWidth.right) {
    x1 = cursor.x + cell.width;
    y1 = cursor.y;
    x2 = cursor.x + cell.width;
    y2 = cursor.y + cell.height;
    if (lineWidth.top) {
      y1 -= 0.5 * lineWidth.top;
    }
    if (lineWidth.bottom) {
      y2 += 0.5 * lineWidth.bottom;
    }
    drawLine(lineWidth.right, x1, y1, x2, y2);
  }
  function drawLine(width, x12, y12, x22, y22) {
    doc.getDocument().setLineWidth(width);
    doc.getDocument().line(x12, y12, x22, y22, "S");
  }
}
function getRemainingPageSpace(doc, table, isLastRow, cursor) {
  var bottomContentHeight = table.settings.margin.bottom;
  var showFoot = table.settings.showFoot;
  if (showFoot === "everyPage" || showFoot === "lastPage" && isLastRow) {
    bottomContentHeight += table.getFootHeight(table.columns);
  }
  return doc.pageSize().height - cursor.y - bottomContentHeight;
}
function addPage(doc, table, startPos, cursor, columns, suppressFooter) {
  if (columns === void 0) {
    columns = [];
  }
  if (suppressFooter === void 0) {
    suppressFooter = false;
  }
  doc.applyStyles(doc.userStyles);
  if (table.settings.showFoot === "everyPage" && !suppressFooter) {
    table.foot.forEach(function(row) {
      return printRow(doc, table, row, cursor, columns);
    });
  }
  table.callEndPageHooks(doc, cursor);
  var margin = table.settings.margin;
  addTableBorder(doc, table, startPos, cursor);
  nextPage(doc);
  table.pageNumber++;
  cursor.x = margin.left;
  cursor.y = margin.top;
  startPos.y = margin.top;
  table.callWillDrawPageHooks(doc, cursor);
  if (table.settings.showHead === "everyPage") {
    table.head.forEach(function(row) {
      return printRow(doc, table, row, cursor, columns);
    });
    doc.applyStyles(doc.userStyles);
  }
}
function nextPage(doc) {
  var current = doc.pageNumber();
  doc.setPage(current + 1);
  var newCurrent = doc.pageNumber();
  if (newCurrent === current) {
    doc.addPage();
    return true;
  }
  return false;
}
function applyPlugin(jsPDF2) {
  jsPDF2.API.autoTable = function() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var options = args[0];
    var input = parseInput(this, options);
    var table = createTable(this, input);
    drawTable(this, table);
    return this;
  };
  jsPDF2.API.lastAutoTable = false;
  jsPDF2.API.autoTableText = function(text, x, y, styles) {
    autoTableText(text, x, y, styles, this);
  };
  jsPDF2.API.autoTableSetDefaults = function(defaults) {
    DocHandler.setDefaults(defaults, this);
    return this;
  };
  jsPDF2.autoTableSetDefaults = function(defaults, doc) {
    DocHandler.setDefaults(defaults, doc);
  };
  jsPDF2.API.autoTableHtmlToJson = function(tableElem, includeHiddenElements) {
    var _a2;
    if (includeHiddenElements === void 0) {
      includeHiddenElements = false;
    }
    if (typeof window === "undefined") {
      console.error("Cannot run autoTableHtmlToJson in non browser environment");
      return null;
    }
    var doc = new DocHandler(this);
    var _b = parseHtml(doc, tableElem, window, includeHiddenElements, false), head = _b.head, body = _b.body;
    var columns = ((_a2 = head[0]) === null || _a2 === void 0 ? void 0 : _a2.map(function(c) {
      return c.content;
    })) || [];
    return { columns, rows: body, data: body };
  };
}
var _a;
function autoTable(d, options) {
  var input = parseInput(d, options);
  var table = createTable(d, input);
  drawTable(d, table);
}
try {
  if (typeof window !== "undefined" && window) {
    anyWindow = window;
    jsPDF = anyWindow.jsPDF || ((_a = anyWindow.jspdf) === null || _a === void 0 ? void 0 : _a.jsPDF);
    if (jsPDF) {
      applyPlugin(jsPDF);
    }
  }
} catch (error) {
  console.error("Could not apply autoTable plugin", error);
}
var anyWindow;
var jsPDF;

// www/admin/admin.js
var $ = (selector) => document.querySelector(selector);
var state = { user: null, profile: null, materials: [], partners: [], buyers: [], benefits: [], report: null, profileHistory: null, profileRequest: 0, reportRequest: 0, monitorChannel: null, monitorLive: false, monitorTimer: null, monitorTimeout: null, walletTimeout: null };
var collectionStatuses = [
  ["solicitada", "Solicitada"],
  ["confirmada", "Confirmada"],
  ["em_andamento", "Em andamento"],
  ["concluida", "Conclu\xEDda"],
  ["cancelada", "Cancelada"]
];
var toastTimer;
var benefitPreviewUrl;
function toast(message, isError = false) {
  const element = $("#admin-toast");
  element.textContent = message;
  element.classList.toggle("error", isError);
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 4500);
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}
function formatNumber(value, maximumFractionDigits = 1) {
  return Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits });
}
function normalizeCollectionStatus(status) {
  const value = String(status || "solicitada").trim().toLocaleLowerCase("pt-BR");
  const legacyStatuses = {
    solicitado: "solicitada",
    pendente: "solicitada",
    confirmado: "confirmada",
    concluido: "concluida",
    cancelado: "cancelada"
  };
  return legacyStatuses[value] || value;
}
function collectionStatusLabel(status) {
  const value = normalizeCollectionStatus(status);
  return collectionStatuses.find(([key]) => key === value)?.[1] || String(status || "Solicitada");
}
function dateKey(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}
function dateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function reportRange() {
  const mode = $("#report-period").value;
  if (mode === "day") {
    const start = $("#report-day").value;
    if (!start) throw new Error("Escolha o dia para o relat\xF3rio.");
    const next = /* @__PURE__ */ new Date(`${start}T00:00:00`);
    next.setDate(next.getDate() + 1);
    return { mode, start, end: dateInputValue(next) };
  }
  if (mode === "month") {
    const month = $("#report-month").value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Escolha o m\xEAs para o relat\xF3rio.");
    const [year2, monthNumber] = month.split("-").map(Number);
    return { mode, start: `${month}-01`, end: dateInputValue(new Date(year2, monthNumber, 1)) };
  }
  const year = Number($("#report-year").value);
  if (!Number.isInteger(year) || year < 2e3 || year > 2100) throw new Error("Informe um ano v\xE1lido.");
  return { mode, start: `${year}-01-01`, end: `${year + 1}-01-01` };
}
async function fetchAll(queryFactory) {
  const rows = [];
  const pageSize = 1e3;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await queryFactory().range(offset, offset + pageSize - 1);
    if (error) throw error;
    rows.push(...data || []);
    if (!data || data.length < pageSize) return rows;
  }
}
async function initialize() {
  if (!isSupabaseConfigured()) throw new Error("O Supabase n\xE3o est\xE1 configurado.");
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) {
    window.location.replace("../pages/admin-login.html");
    return;
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id,full_name,role").eq("id", user.id).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== "admin") {
    window.location.replace("../pages/app.html");
    return;
  }
  state.user = user;
  state.profile = profile;
  const name = profile.full_name?.trim() || "ReciclaDin";
  $("#admin-user-name").textContent = name;
  $("#admin-first-name").textContent = "ReciclaDin";
  bind();
  await Promise.all([loadOverview(), loadPeople(), loadMaterials()]);
  await loadOperations();
  subscribeToOperations();
}
function bind() {
  const today = /* @__PURE__ */ new Date();
  $("#report-year").value = String(today.getFullYear());
  $("#report-month").value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  $("#report-day").value = dateInputValue(today);
  document.querySelectorAll(".admin-nav [data-section]").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.section));
  });
  document.querySelectorAll("[data-open-section]").forEach((button) => {
    button.addEventListener("click", () => showSection(button.dataset.openSection));
  });
  $("#admin-logout").addEventListener("click", async () => {
    const { error } = await supabase.auth.signOut();
    if (error) return toast(`N\xE3o foi poss\xEDvel sair: ${error.message}`, true);
    window.location.replace("../index.html");
  });
  $("#refresh-overview").addEventListener("click", loadOverview);
  $("#refresh-operations").addEventListener("click", loadOperations);
  $("#refresh-collections").addEventListener("click", loadCollectionRequests);
  $("#admin-collections-body").addEventListener("change", (event) => {
    if (!(event.target instanceof HTMLSelectElement) || !event.target.matches("[data-collection-status]")) return;
    updateCollectionRequestStatus(event.target);
  });
  $("#refresh-wallet").addEventListener("click", loadWallets);
  $("#wallet-partner-search").addEventListener("input", filterWallets);
  $("#material-form").addEventListener("submit", saveMaterial);
  $("#admin-order-form").addEventListener("submit", saveAdminOrder);
  $("#order-material").addEventListener("change", updateAdminOrderPrice);
  ["#order-quantity", "#order-price"].forEach((selector) => $(selector).addEventListener("input", updateAdminOrderTotal));
  $("#materials-body").addEventListener("click", handleMaterialAction);
  $("#benefit-form").addEventListener("submit", saveBenefit);
  $("#benefits-body").addEventListener("click", handleBenefitAction);
  $("#benefit-image").addEventListener("change", previewBenefitImage);
  $("#operations-body").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-table]");
    if (button) deleteOperationRecord(button);
  });
  $("#manual-weighing-form").addEventListener("submit", saveManualWeighing);
  ["#manual-weight", "#manual-price"].forEach((selector) => $(selector).addEventListener("input", updateManualTotal));
  $("#manual-material").addEventListener("change", syncManualMaterialPrice);
  $("#partner-search").addEventListener("input", () => filterPeople("partner"));
  $("#buyer-search").addEventListener("input", () => filterPeople("buyer"));
  $("#admin-people").addEventListener("click", (event) => {
    const activeButton = event.target.closest("[data-toggle-profile-active]");
    if (activeButton) {
      updateProfileActiveStatus(activeButton);
      return;
    }
    const profileButton = event.target.closest("[data-profile-id]");
    if (profileButton) openProfileDetail(profileButton.dataset.profileId, profileButton.dataset.profileRole);
  });
  $("#profile-records-body").addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-profile-record]");
    if (button) deleteProfileRecord(button);
  });
  $("#profile-back").addEventListener("click", () => showSection("people"));
  $("#profile-export-pdf").addEventListener("click", exportProfilePdf);
  ["#profile-filter-year", "#profile-filter-month", "#profile-filter-week"].forEach((selector) => $(selector).addEventListener("change", (event) => {
    if (event.currentTarget.id !== "profile-filter-week") updateProfileFilterOptions();
    loadProfileHistory();
  }));
  const syncRange = () => {
    const mode = $("#report-period").value;
    $("#year-filter").hidden = mode !== "year";
    $("#month-filter").hidden = mode !== "month";
    $("#day-filter").hidden = mode !== "day";
    loadReport();
  };
  $("#report-period").addEventListener("change", syncRange);
  ["#report-year", "#report-month", "#report-day"].forEach((selector) => $(selector).addEventListener("change", loadReport));
  ["#report-buyer", "#report-partner"].forEach((selector) => $(selector).addEventListener("input", renderReport));
  $("#export-pdf").addEventListener("click", exportReportPdf);
}
function showSection(section) {
  if (section !== "profile" && state.profileHistory) state.profileRequest++;
  document.querySelectorAll(".admin-view").forEach((view) => view.classList.toggle("active", view.id === `admin-${section}`));
  document.querySelectorAll(".admin-nav [data-section]").forEach((button) => button.classList.toggle("active", button.dataset.section === section));
  const titles = { dashboard: "Vis\xE3o geral", "manual-weighing": "Cadastrar pesagem manual", people: "Compradores e parceiros", profile: "Perfil do cliente", collections: "Coletas", wallet: "Carteira Verde", materials: "Materiais", benefits: "Produtos e pr\xEAmios", reports: "Relat\xF3rios" };
  $("#admin-page-title").textContent = titles[section] || "Administra\xE7\xE3o";
  if (section === "collections") loadCollectionRequests();
  if (section === "wallet") loadWallets();
  if (section === "reports") loadReport();
  if (section === "benefits") loadBenefits();
}
async function loadCollectionRequests() {
  const body = $("#admin-collections-body");
  const count = $("#collection-request-count");
  body.innerHTML = '<tr><td colspan="8">Carregando solicita\xE7\xF5es...</td></tr>';
  count.textContent = "Carregando solicita\xE7\xF5es...";
  try {
    const [collections, oilCollections] = await Promise.all([
      fetchAll(() => supabase.from("collections").select("id,partner_id,type,requested_date,requested_period,notes,status,created_at").order("requested_date", { ascending: false }).order("id", { ascending: false })),
      fetchAll(() => supabase.from("oil_collections").select("id,partner_id,liters,requested_date,requested_period,notes,status,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }))
    ]);
    const partnerIds = [...new Set([...collections, ...oilCollections].map((row) => row.partner_id).filter(Boolean))];
    const partners = partnerIds.length ? await fetchAll(() => supabase.from("profiles").select("id,full_name").in("id", partnerIds).order("id")) : [];
    const names = new Map(partners.map((partner) => [partner.id, partner.full_name || "Sem nome"]));
    const requests = [
      ...collections.map((row) => ({
        table: "collections",
        id: row.id,
        date: row.requested_date || row.created_at,
        partner: names.get(row.partner_id) || "Parceiro n\xE3o encontrado",
        operation: row.type || "Retirada de Reciclagem",
        period: row.requested_period,
        quantity: "\u2014",
        notes: row.notes,
        status: normalizeCollectionStatus(row.status)
      })),
      ...oilCollections.map((row) => ({
        table: "oil_collections",
        id: row.id,
        date: row.requested_date || row.created_at,
        partner: names.get(row.partner_id) || "Parceiro n\xE3o encontrado",
        operation: "Retirada de \xD3leo Usado",
        period: row.requested_period,
        quantity: `${formatNumber(row.liters)} L`,
        notes: row.notes,
        status: normalizeCollectionStatus(row.status)
      }))
    ].sort((left, right) => dateKey(right.date).localeCompare(dateKey(left.date)));
    body.innerHTML = requests.map((row) => {
      const date = dateKey(row.date);
      const displayDate = date ? (/* @__PURE__ */ new Date(`${date}T00:00:00`)).toLocaleDateString("pt-BR") : "\u2014";
      const period = row.period === "manha" ? "Manh\xE3" : row.period === "tarde" ? "Tarde" : "\u2014";
      const currentStatus = normalizeCollectionStatus(row.status);
      const statusOptions = collectionStatuses.map(([value, label]) => `<option value="${value}" ${currentStatus === value ? "selected" : ""}>${label}</option>`).join("");
      const unknownStatus = collectionStatuses.some(([value]) => value === currentStatus) ? "" : `<option value="${escapeHtml(currentStatus)}" selected>${escapeHtml(row.status)}</option>`;
      return `<tr><td>${escapeHtml(displayDate)}</td><td>${escapeHtml(row.partner)}</td><td>${escapeHtml(row.operation)}</td><td>${period}</td><td>${escapeHtml(row.quantity)}</td><td class="admin-collection-notes" title="${escapeHtml(row.notes || "")}">${escapeHtml(row.notes || "\u2014")}</td><td><span class="admin-live-status">${escapeHtml(collectionStatusLabel(row.status))}</span></td><td><select class="admin-input" data-collection-status data-table="${row.table}" data-id="${Number(row.id)}" data-current-status="${escapeHtml(currentStatus)}" aria-label="Atualizar status da coleta">${unknownStatus}${statusOptions}</select></td></tr>`;
    }).join("") || '<tr><td colspan="8">Nenhuma solicita\xE7\xE3o de coleta registrada.</td></tr>';
    count.textContent = `${formatNumber(requests.length, 0)} solicita\xE7\xF5es`;
  } catch (error) {
    body.innerHTML = `<tr><td colspan="8">Falha ao carregar coletas: ${escapeHtml(error.message || error)}</td></tr>`;
    count.textContent = "N\xE3o foi poss\xEDvel carregar";
    toast(`Falha ao carregar solicita\xE7\xF5es de coleta: ${error.message || error}`, true);
  }
}
async function updateCollectionRequestStatus(select) {
  const table = select.dataset.table;
  const id = Number(select.dataset.id);
  const status = normalizeCollectionStatus(select.value);
  const previousStatus = select.dataset.currentStatus;
  if (!["collections", "oil_collections"].includes(table) || !Number.isSafeInteger(id) || id <= 0 || !collectionStatuses.some(([value]) => value === status)) {
    toast("N\xE3o foi poss\xEDvel atualizar a coleta: dados de status inv\xE1lidos.", true);
    select.value = previousStatus;
    return;
  }
  select.disabled = true;
  try {
    const { data, error } = await supabase.from(table).update({ status }).eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("A coleta n\xE3o foi atualizada. Atualize a lista e tente novamente.");
    toast(status === "confirmada" ? "Coleta confirmada. O parceiro ver\xE1 a confirma\xE7\xE3o." : "Status da coleta atualizado.");
    await loadCollectionRequests();
  } catch (error) {
    select.disabled = false;
    select.value = previousStatus;
    toast(`N\xE3o foi poss\xEDvel atualizar a coleta: ${error.message}`, true);
  }
}
async function loadWallets() {
  const body = $("#admin-wallet-body");
  $("#admin-wallet-redemptions-body").innerHTML = '<tr><td colspan="5">Carregando resgates...</td></tr>';
  body.innerHTML = '<tr><td colspan="3">Carregando saldos...</td></tr>';
  $("#wallet-partner-count").textContent = "\u2026";
  $("#wallet-points-total").textContent = "\u2026";
  try {
    const [partners, wallets] = await Promise.all([
      fetchAll(() => supabase.from("profiles").select("id,full_name").eq("role", "partner").order("full_name").order("id")),
      fetchAll(() => supabase.from("green_wallet").select("partner_id,points_balance,updated_at").order("updated_at", { ascending: false }))
    ]);
    const balances = new Map(wallets.map((wallet) => [wallet.partner_id, wallet]));
    const rows = partners.map((partner) => ({
      name: partner.full_name || "Sem nome",
      balance: balances.has(partner.id) ? Number(balances.get(partner.id).points_balance) : null,
      updatedAt: balances.get(partner.id)?.updated_at || ""
    })).sort((left, right) => right.balance - left.balance || left.name.localeCompare(right.name, "pt-BR"));
    const initializedRows = rows.filter((row) => row.balance !== null && Number.isFinite(row.balance));
    const missingWallets = rows.length - initializedRows.length;
    $("#wallet-partner-count").textContent = formatNumber(initializedRows.length, 0);
    $("#wallet-points-total").textContent = missingWallets ? "\u2014" : formatNumber(initializedRows.reduce((sum, row) => sum + row.balance, 0), 2);
    body.innerHTML = rows.map((row) => {
      const updatedAt = row.updatedAt ? new Date(row.updatedAt).toLocaleString("pt-BR") : "Ainda sem movimenta\xE7\xE3o";
      const balance = row.balance === null || !Number.isFinite(row.balance) ? "Carteira n\xE3o inicializada" : `${formatNumber(row.balance, 2)} pts`;
      return `<tr data-partner-name="${escapeHtml(row.name.toLocaleLowerCase("pt-BR"))}"><td>${escapeHtml(row.name)}</td><td class="admin-wallet-balance">${balance}</td><td>${escapeHtml(updatedAt)}</td></tr>`;
    }).join("") || '<tr><td colspan="3">Nenhum parceiro cadastrado.</td></tr>';
    filterWallets();
    await loadRecentBenefitRedemptions(partners);
    if (missingWallets) {
      toast(`${missingWallets} carteira(s) n\xE3o inicializada(s). Aplique as migra\xE7\xF5es do Supabase.`, true);
    }
  } catch (error) {
    body.innerHTML = `<tr><td colspan="3">Falha ao carregar carteiras: ${escapeHtml(error.message || error)}</td></tr>`;
    $("#wallet-partner-count").textContent = "\u2014";
    $("#wallet-points-total").textContent = "\u2014";
    toast(`Falha ao carregar Carteiras Verdes: ${error.message || error}`, true);
  }
}
async function loadRecentBenefitRedemptions(partners) {
  const body = $("#admin-wallet-redemptions-body");
  try {
    const { data: redemptionsData, error: redemptionsError } = await supabase.from("benefit_redemptions").select("id,partner_id,benefit_id,points_used,status,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50);
    if (redemptionsError) throw redemptionsError;
    const redemptions = redemptionsData || [];
    const benefitIds = [...new Set(redemptions.map((redemption) => redemption.benefit_id))];
    let benefitsById = /* @__PURE__ */ new Map();
    if (benefitIds.length) {
      const { data, error } = await supabase.from("benefits").select("id,title,name").in("id", benefitIds);
      if (error) throw error;
      benefitsById = new Map((data || []).map((benefit) => [benefit.id, benefit.title || benefit.name || "Kit sem nome"]));
    }
    const partnersById = new Map(partners.map((partner) => [partner.id, partner.full_name || "Sem nome"]));
    const statusLabels = {
      solicitado: "Solicitado",
      em_andamento: "Em andamento",
      retirado: "Retirado",
      retirada: "Retirado",
      entregue: "Entregue",
      concluido: "Conclu\xEDdo",
      concluida: "Conclu\xEDda",
      cancelado: "Cancelado",
      cancelada: "Cancelada"
    };
    body.innerHTML = redemptions.map((redemption) => {
      const status = String(redemption.status || "solicitado").trim().toLocaleLowerCase("pt-BR");
      const createdAt = redemption.created_at ? new Date(redemption.created_at).toLocaleString("pt-BR") : "\u2014";
      return `<tr><td>${escapeHtml(createdAt)}</td><td>${escapeHtml(partnersById.get(redemption.partner_id) || "Parceiro n\xE3o encontrado")}</td><td>${escapeHtml(benefitsById.get(redemption.benefit_id) || `Kit #${redemption.benefit_id}`)}</td><td>${formatNumber(redemption.points_used, 2)} pts</td><td>${escapeHtml(statusLabels[status] || redemption.status || "Solicitado")}</td></tr>`;
    }).join("") || '<tr><td colspan="5">Nenhum kit resgatado ainda.</td></tr>';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="5">Falha ao carregar resgates: ${escapeHtml(error.message || error)}</td></tr>`;
    toast(`Falha ao carregar os resgates dos parceiros: ${error.message || error}`, true);
  }
}
function filterWallets() {
  const query = $("#wallet-partner-search").value.trim().toLocaleLowerCase("pt-BR");
  document.querySelectorAll("#admin-wallet-body tr[data-partner-name]").forEach((row) => {
    row.hidden = !row.dataset.partnerName.includes(query);
  });
}
var BENEFIT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
var BENEFIT_IMAGE_TYPES = /* @__PURE__ */ new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
function previewBenefitImage(event) {
  const file = event.currentTarget.files[0];
  const preview = $("#benefit-image-preview");
  const image = $("#benefit-image-preview-img");
  if (benefitPreviewUrl) URL.revokeObjectURL(benefitPreviewUrl);
  benefitPreviewUrl = null;
  if (!file) {
    image.removeAttribute("src");
    preview.hidden = true;
    return;
  }
  if (!BENEFIT_IMAGE_TYPES.has(file.type) || file.size > BENEFIT_IMAGE_MAX_BYTES) {
    image.removeAttribute("src");
    preview.hidden = true;
    return;
  }
  benefitPreviewUrl = URL.createObjectURL(file);
  image.src = benefitPreviewUrl;
  preview.hidden = false;
}
async function saveBenefit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const name = $("#benefit-name").value.trim();
  const description = $("#benefit-description").value.trim();
  const pointsCost = Number($("#benefit-points").value);
  const retailValue = Number($("#benefit-retail-value").value || 0);
  const file = $("#benefit-image").files[0];
  if (!name || !Number.isSafeInteger(pointsCost) || pointsCost < 1 || !Number.isFinite(retailValue) || retailValue < 0 || !file) {
    toast("Informe nome, pontos inteiros positivos, valor estimado v\xE1lido e uma foto do produto.", true);
    return;
  }
  const extension = BENEFIT_IMAGE_TYPES.get(file.type);
  if (!extension || file.size > BENEFIT_IMAGE_MAX_BYTES) {
    toast("Escolha uma imagem JPG, PNG ou WebP de at\xE9 5 MB.", true);
    return;
  }
  button.disabled = true;
  button.textContent = "Enviando foto e cadastrando...";
  let uploadedPath = null;
  let imageUploaded = false;
  try {
    uploadedPath = `benefits/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("produtos").upload(uploadedPath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false
    });
    if (uploadError) throw uploadError;
    imageUploaded = true;
    const { data: publicUrlData } = supabase.storage.from("produtos").getPublicUrl(uploadedPath);
    const photoUrl = publicUrlData?.publicUrl;
    if (!photoUrl) throw new Error("N\xE3o foi poss\xEDvel obter a URL p\xFAblica da foto.");
    const { error: insertError } = await supabase.from("benefits").insert({
      title: name,
      name,
      description: description || null,
      points_cost: pointsCost,
      retail_value: retailValue,
      photo_url: photoUrl,
      active: true
    });
    if (insertError) throw insertError;
    form.reset();
    $("#benefit-image-preview-img").removeAttribute("src");
    $("#benefit-image-preview").hidden = true;
    if (benefitPreviewUrl) URL.revokeObjectURL(benefitPreviewUrl);
    benefitPreviewUrl = null;
    toast("Produto cadastrado no cat\xE1logo.");
    await loadBenefits();
  } catch (error) {
    let message = error.message || String(error);
    if (imageUploaded && uploadedPath) {
      try {
        const { error: cleanupError } = await supabase.storage.from("produtos").remove([uploadedPath]);
        if (cleanupError) message += `. Tamb\xE9m n\xE3o foi poss\xEDvel remover a foto enviada: ${cleanupError.message}`;
      } catch (cleanupError) {
        message += `. Tamb\xE9m ocorreu um erro ao remover a foto enviada: ${cleanupError.message || cleanupError}`;
      }
    }
    toast(`N\xE3o foi poss\xEDvel cadastrar o produto: ${message}`, true);
  } finally {
    button.disabled = false;
    button.innerHTML = "Cadastrar produto <span>\u2192</span>";
  }
}
async function loadBenefits() {
  const body = $("#benefits-body");
  body.innerHTML = '<tr><td colspan="7">Carregando produtos...</td></tr>';
  try {
    const { data, error } = await supabase.from("benefits").select("id,title,name,description,points_cost,retail_value,photo_url,active").order("title");
    if (error) throw error;
    state.benefits = (data || []).map((benefit) => ({
      ...benefit,
      name: benefit.name || benefit.title || "Produto sem nome"
    }));
    $("#benefit-count").textContent = formatNumber(state.benefits.length, 0);
    body.innerHTML = state.benefits.map((benefit) => `<tr data-benefit-id="${Number(benefit.id)}">
      <td>${benefit.photo_url ? `<img class="admin-benefit-thumb" src="${escapeHtml(benefit.photo_url)}" alt="" loading="lazy">` : '<span class="admin-benefit-placeholder" aria-hidden="true">\u{1F381}</span>'}</td>
      <td>${escapeHtml(benefit.name)}</td>
      <td class="admin-benefit-description-cell" title="${escapeHtml(benefit.description || "")}">${escapeHtml(benefit.description || "\u2014")}</td>
      <td>${formatNumber(benefit.points_cost, 0)} pts</td>
      <td>${Number(benefit.retail_value || 0) > 0 ? `R$ ${formatNumber(benefit.retail_value, 2)}` : "N\xE3o informado"}</td>
      <td>${benefit.active ? "Ativo" : "Pausado"}</td>
      <td><button class="admin-benefit-toggle ${benefit.active ? "active" : ""}" type="button" data-action="toggle-benefit" aria-label="${benefit.active ? "Pausar" : "Ativar"} ${escapeHtml(benefit.name)}">${benefit.active ? "Pausar" : "Ativar"}</button></td>
    </tr>`).join("") || '<tr><td colspan="7">Nenhum produto cadastrado.</td></tr>';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="7">N\xE3o foi poss\xEDvel carregar o cat\xE1logo: ${escapeHtml(error.message || error)}</td></tr>`;
    toast(`N\xE3o foi poss\xEDvel carregar os produtos: ${error.message || error}`, true);
  }
}
async function handleBenefitAction(event) {
  const button = event.target.closest('[data-action="toggle-benefit"]');
  if (!button) return;
  const row = button.closest("[data-benefit-id]");
  const benefit = state.benefits.find((item) => Number(item.id) === Number(row?.dataset.benefitId));
  if (!benefit) {
    toast("Produto n\xE3o encontrado. Atualize o cat\xE1logo e tente novamente.", true);
    return;
  }
  button.disabled = true;
  try {
    const { error } = await supabase.from("benefits").update({ active: !benefit.active }).eq("id", benefit.id);
    if (error) throw error;
    toast(benefit.active ? "Produto pausado no cat\xE1logo." : "Produto ativado no cat\xE1logo.");
    await loadBenefits();
  } catch (error) {
    button.disabled = false;
    toast(`N\xE3o foi poss\xEDvel alterar o produto: ${error.message || error}`, true);
  }
}
async function loadOverview() {
  const metrics = ["partners", "buyers", "orders", "collections", "weight", "oil"];
  metrics.forEach((key) => {
    $(`#overview-${key}`).textContent = "\u2026";
  });
  try {
    const [partners, buyers, orders, collections, weighings, oil] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "partner"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "buyer"),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("collections").select("id", { count: "exact", head: true }),
      fetchAll(() => supabase.from("weighings").select("id,total_kg").order("id", { ascending: true })),
      fetchAll(() => supabase.from("oil_collections").select("id,liters").order("id", { ascending: true }))
    ]);
    const error = [partners, buyers, orders, collections].find((result) => result.error)?.error;
    if (error) throw error;
    $("#overview-partners").textContent = formatNumber(partners.count, 0);
    $("#overview-buyers").textContent = formatNumber(buyers.count, 0);
    $("#overview-orders").textContent = formatNumber(orders.count, 0);
    $("#overview-collections").textContent = formatNumber(collections.count, 0);
    $("#overview-weight").textContent = `${formatNumber(weighings.reduce((sum, row) => sum + Number(row.total_kg || 0), 0))} kg`;
    $("#overview-oil").textContent = `${formatNumber(oil.reduce((sum, row) => sum + Number(row.liters || 0), 0))} L`;
  } catch (error) {
    metrics.forEach((key) => {
      $(`#overview-${key}`).textContent = "\u2014";
    });
    toast(`Falha ao atualizar indicadores: ${error.message || error}`, true);
  }
}
async function loadPeople() {
  const bodies = { partner: $("#partners-body"), buyer: $("#buyers-body") };
  try {
    const [profiles, collections, weighings, orders] = await Promise.all([
      fetchAll(() => supabase.from("profiles").select("id,full_name,cpf,role,is_active").in("role", ["partner", "buyer"]).order("full_name").order("id")),
      fetchAll(() => supabase.from("collections").select("partner_id").order("id")),
      fetchAll(() => supabase.from("weighings").select("partner_id").order("id")),
      fetchAll(() => supabase.from("orders").select("buyer_id").order("id"))
    ]);
    const counts = (rows) => rows.reduce((map, row) => {
      const id = row.partner_id || row.buyer_id;
      map.set(id, (map.get(id) || 0) + 1);
      return map;
    }, /* @__PURE__ */ new Map());
    const collectionCounts = counts(collections);
    const weighingCounts = counts(weighings);
    const orderCounts = counts(orders);
    const partners = profiles.filter((profile) => profile.role === "partner");
    const buyers = profiles.filter((profile) => profile.role === "buyer");
    state.partners = partners;
    state.buyers = buyers;
    const partnerSelect = $("#manual-partner");
    const selectedPartner = partnerSelect.value;
    const activePartners = partners.filter((profile) => profile.is_active !== false);
    partnerSelect.innerHTML = '<option value="">Selecione um parceiro...</option>' + activePartners.map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.full_name || "Parceiro sem nome")}</option>`).join("");
    if (activePartners.some((profile) => profile.id === selectedPartner)) partnerSelect.value = selectedPartner;
    const buyerSelect = $("#order-buyer");
    const selectedBuyer = buyerSelect.value;
    const activeBuyers = buyers.filter((profile) => profile.is_active !== false);
    buyerSelect.innerHTML = '<option value="">Selecione um comprador...</option>' + activeBuyers.map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.full_name || "Comprador sem nome")}</option>`).join("");
    if (activeBuyers.some((profile) => profile.id === selectedBuyer)) buyerSelect.value = selectedBuyer;
    $("#partner-count").textContent = formatNumber(partners.length, 0);
    $("#buyer-count").textContent = formatNumber(buyers.length, 0);
    bodies.partner.innerHTML = partners.map((profile) => {
      const active = profile.is_active !== false;
      return `<tr data-person-name="${escapeHtml(profile.full_name || "")}"><td><button class="admin-profile-link" type="button" data-profile-id="${escapeHtml(profile.id)}" data-profile-role="partner">${escapeHtml(profile.full_name || "Sem nome")}</button></td><td>${escapeHtml(profile.cpf || "\u2014")}</td><td>${collectionCounts.get(profile.id) || 0}</td><td>${weighingCounts.get(profile.id) || 0}</td><td>${active ? "Ativa" : "Desativada"}</td><td><button class="admin-status-button" type="button" data-toggle-profile-active data-profile-id="${escapeHtml(profile.id)}" data-profile-role="partner" data-active="${active}" aria-label="${active ? "Desativar" : "Reativar"} conta de ${escapeHtml(profile.full_name || "parceiro")}">${active ? "Desativar" : "Reativar"}</button></td></tr>`;
    }).join("") || '<tr><td colspan="6">Nenhum parceiro cadastrado.</td></tr>';
    bodies.buyer.innerHTML = buyers.map((profile) => {
      const active = profile.is_active !== false;
      return `<tr data-person-name="${escapeHtml(profile.full_name || "")}"><td><button class="admin-profile-link" type="button" data-profile-id="${escapeHtml(profile.id)}" data-profile-role="buyer">${escapeHtml(profile.full_name || "Sem nome")}</button></td><td>${escapeHtml(profile.cpf || "\u2014")}</td><td>${orderCounts.get(profile.id) || 0}</td><td>${active ? "Ativa" : "Desativada"}</td><td><button class="admin-status-button" type="button" data-toggle-profile-active data-profile-id="${escapeHtml(profile.id)}" data-profile-role="buyer" data-active="${active}" aria-label="${active ? "Desativar" : "Reativar"} conta de ${escapeHtml(profile.full_name || "comprador")}">${active ? "Desativar" : "Reativar"}</button></td></tr>`;
    }).join("") || '<tr><td colspan="5">Nenhum comprador cadastrado.</td></tr>';
    filterPeople("partner");
    filterPeople("buyer");
  } catch (error) {
    Object.values(bodies).forEach((body, index) => {
      body.innerHTML = `<tr><td colspan="${index ? 5 : 6}">N\xE3o foi poss\xEDvel carregar os perfis: ${escapeHtml(error.message || error)}</td></tr>`;
    });
    toast(`Falha ao carregar compradores e parceiros: ${error.message || error}`, true);
  }
}
async function updateProfileActiveStatus(button) {
  const profileId = button.dataset.profileId;
  const role = button.dataset.profileRole;
  const active = button.dataset.active === "true";
  if (!profileId || !["partner", "buyer"].includes(role)) {
    toast("N\xE3o foi poss\xEDvel atualizar o perfil: dados inv\xE1lidos.", true);
    return;
  }
  const nextActive = !active;
  const action = nextActive ? "reativar" : "desativar";
  if (!window.confirm(`Deseja ${action} esta conta?`)) return;
  button.disabled = true;
  try {
    const { data, error } = await supabase.from("profiles").update({ is_active: nextActive }).eq("id", profileId).eq("role", role).select("id,is_active").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Nenhuma conta foi atualizada. Atualize a lista e tente novamente.");
    toast(`Conta ${nextActive ? "reativada" : "desativada"} com sucesso.`);
    await loadPeople();
  } catch (error) {
    button.disabled = false;
    toast(`N\xE3o foi poss\xEDvel ${action} a conta: ${error.message || error}`, true);
  }
}
function filterPeople(role) {
  const body = $(`#${role === "partner" ? "partners-body" : "buyers-body"}`);
  const search = $(`#${role === "partner" ? "partner-search" : "buyer-search"}`).value.trim().toLocaleLowerCase("pt-BR");
  let visible = 0;
  body.querySelectorAll("tr[data-person-name]").forEach((row) => {
    const matches = row.dataset.personName.toLocaleLowerCase("pt-BR").includes(search);
    row.hidden = !matches;
    if (matches) visible++;
  });
  $(`#${role === "partner" ? "partner-count" : "buyer-count"}`).textContent = formatNumber(visible, 0);
}
function normalizeMaterialName(value) {
  return String(value || "").trim().toLocaleLowerCase("pt-BR");
}
function profileRecordQuery(role, profileId) {
  if (role === "partner") {
    return supabase.from("weighings").select("id,created_at,material_name,total_kg,price_per_kg").eq("partner_id", profileId).order("created_at", { ascending: false }).order("id", { ascending: false });
  }
  return supabase.from("orders").select("id,created_at,material_name,quantity_kg,material_id,price_per_kg,total_value").eq("buyer_id", profileId).order("created_at", { ascending: false }).order("id", { ascending: false });
}
function dateKeyFromParts(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function isoWeekNumber(value) {
  const date = /* @__PURE__ */ new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 864e5 + 1) / 7);
}
function selectedProfileDateRanges() {
  const yearValue = $("#profile-filter-year").value;
  const monthValue = $("#profile-filter-month").value;
  const weekValue = $("#profile-filter-week").value;
  if (!yearValue) return null;
  const year = Number(yearValue);
  let start = `${year}-01-01`;
  let end = `${year + 1}-01-01`;
  if (monthValue) {
    const month = Number(monthValue);
    start = dateKeyFromParts(year, month, 1);
    end = month === 12 ? `${year + 1}-01-01` : dateKeyFromParts(year, month + 1, 1);
  }
  if (!weekValue) return [{ start, end }];
  const ranges = [];
  let rangeStart = null;
  let previousKey = null;
  const cursor = /* @__PURE__ */ new Date(`${start}T00:00:00Z`);
  const rangeEnd = /* @__PURE__ */ new Date(`${end}T00:00:00Z`);
  while (cursor < rangeEnd) {
    const key = dateKeyFromParts(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate());
    if (isoWeekNumber(key) === Number(weekValue)) {
      if (!rangeStart) rangeStart = key;
      previousKey = key;
    } else if (rangeStart) {
      const nextDay = /* @__PURE__ */ new Date(`${previousKey}T00:00:00Z`);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      ranges.push({ start: rangeStart, end: dateKeyFromParts(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()) });
      rangeStart = null;
      previousKey = null;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (rangeStart && previousKey) {
    const nextDay = /* @__PURE__ */ new Date(`${previousKey}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    ranges.push({ start: rangeStart, end: dateKeyFromParts(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate()) });
  }
  return ranges;
}
function updateProfileFilterOptions() {
  const history = state.profileHistory;
  if (!history) return;
  const yearSelect = $("#profile-filter-year");
  const monthSelect = $("#profile-filter-month");
  const weekSelect = $("#profile-filter-week");
  const selectedYear = yearSelect.value;
  const selectedMonth = monthSelect.value;
  const selectedWeek = weekSelect.value;
  const yearKeys = [...new Set(history.dateKeys.map((key) => key.slice(0, 4)))].sort().reverse();
  yearSelect.innerHTML = '<option value="">Todos os anos</option>' + yearKeys.map((year2) => `<option value="${year2}">${year2}</option>`).join("");
  if (yearKeys.includes(selectedYear)) yearSelect.value = selectedYear;
  const year = yearSelect.value;
  const matchingMonthDates = history.dateKeys.filter((key) => !year || key.startsWith(`${year}-`));
  const monthKeys = [...new Set(matchingMonthDates.map((key) => key.slice(5, 7)))].sort();
  monthSelect.disabled = !year;
  monthSelect.innerHTML = '<option value="">Todos os meses</option>' + monthKeys.map((month2) => {
    const label = new Date(Date.UTC(2020, Number(month2) - 1, 1)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
    return `<option value="${Number(month2)}">${label}</option>`;
  }).join("");
  if (monthKeys.includes(String(selectedMonth).padStart(2, "0"))) monthSelect.value = String(Number(selectedMonth));
  const month = monthSelect.value;
  const matchingWeekDates = history.dateKeys.filter(
    (key) => (!year || key.startsWith(`${year}-`)) && (!month || Number(key.slice(5, 7)) === Number(month))
  );
  const weekNumbers = [...new Set(matchingWeekDates.map(isoWeekNumber))].sort((a, b) => a - b);
  weekSelect.disabled = !year;
  weekSelect.innerHTML = '<option value="">Todas as semanas</option>' + weekNumbers.map((week) => `<option value="${week}">Semana ${String(week).padStart(2, "0")}</option>`).join("");
  if (weekNumbers.includes(Number(selectedWeek))) weekSelect.value = selectedWeek;
}
async function openProfileDetail(profileId, role) {
  if (!["partner", "buyer"].includes(role) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(profileId || "")) {
    toast("Perfil inv\xE1lido para consulta.", true);
    return;
  }
  const profile = (role === "partner" ? state.partners : state.buyers).find((item) => item.id === profileId);
  if (!profile) {
    toast("O perfil n\xE3o est\xE1 mais na lista. Atualize os cadastros e tente novamente.", true);
    return;
  }
  const requestId = ++state.profileRequest;
  state.profileHistory = { profile, role, dateKeys: [], rows: [] };
  $("#profile-kind").textContent = role === "partner" ? "PERFIL DO PARCEIRO \xB7 CONDOM\xCDNIO" : "PERFIL DO COMPRADOR \xB7 FERRO-VELHO";
  $("#profile-name").textContent = profile.full_name || "Sem nome";
  $("#profile-description").textContent = role === "partner" ? "Pesagens registradas, materiais recebidos e valores calculados." : "Transa\xE7\xF5es e valores lan\xE7ados pelo administrador. Compradores n\xE3o acumulam pontos.";
  $("#profile-table-title").textContent = role === "partner" ? "Pesagens do parceiro" : "Pedidos do comprador";
  $("#profile-table-description").textContent = role === "partner" ? "Pre\xE7o unit\xE1rio e total registrados em cada pesagem." : "Valores registrados diretamente no lan\xE7amento administrativo.";
  $("#profile-total-value-label").textContent = role === "buyer" ? "Valor lan\xE7ado" : "Valor calculado";
  $("#profile-estimate-note").hidden = true;
  $("#profile-filter-year").innerHTML = '<option value="">Todos os anos</option>';
  $("#profile-filter-year").value = "";
  $("#profile-filter-month").innerHTML = '<option value="">Todos os meses</option>';
  $("#profile-filter-month").value = "";
  $("#profile-filter-month").disabled = true;
  $("#profile-filter-week").innerHTML = '<option value="">Todas as semanas</option>';
  $("#profile-filter-week").value = "";
  $("#profile-filter-week").disabled = true;
  $("#profile-export-pdf").disabled = true;
  showSection("profile");
  $("#profile-records-body").innerHTML = '<tr><td colspan="6">Carregando registros do cliente...</td></tr>';
  $("#profile-record-count").textContent = "\u2026";
  $("#profile-total-weight").textContent = "\u2026";
  $("#profile-total-value").textContent = "\u2026";
  try {
    const foreignKey = role === "partner" ? "partner_id" : "buyer_id";
    const table = role === "partner" ? "weighings" : "orders";
    const dates = await fetchAll(() => supabase.from(table).select("id,created_at").eq(foreignKey, profileId).order("created_at").order("id"));
    if (requestId !== state.profileRequest) return;
    state.profileHistory.dateKeys = [...new Set(dates.map((row) => dateKey(row.created_at)).filter(Boolean))].sort();
    updateProfileFilterOptions();
    await loadProfileHistory();
  } catch (error) {
    if (requestId !== state.profileRequest) return;
    $("#profile-records-body").innerHTML = `<tr><td colspan="6">N\xE3o foi poss\xEDvel carregar os filtros do perfil: ${escapeHtml(error.message || error)}</td></tr>`;
    $("#profile-export-pdf").disabled = false;
    toast(`N\xE3o foi poss\xEDvel abrir o perfil: ${error.message || error}`, true);
  }
}
async function loadProfileHistory() {
  const history = state.profileHistory;
  if (!history) return;
  const requestId = ++state.profileRequest;
  const ranges = selectedProfileDateRanges();
  $("#profile-export-pdf").disabled = true;
  $("#profile-records-body").innerHTML = '<tr><td colspan="6">Atualizando registros...</td></tr>';
  try {
    let records;
    if (!ranges) {
      records = await fetchAll(() => profileRecordQuery(history.role, history.profile.id));
    } else {
      const queries = ranges.map((range) => {
        const fromTime = (/* @__PURE__ */ new Date(`${range.start}T00:00:00`)).toISOString();
        const toTime = (/* @__PURE__ */ new Date(`${range.end}T00:00:00`)).toISOString();
        return fetchAll(() => profileRecordQuery(history.role, history.profile.id).gte("created_at", fromTime).lt("created_at", toTime));
      });
      records = (await Promise.all(queries)).flat().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    if (requestId !== state.profileRequest) return;
    const materialsById = new Map(state.materials.map((material) => [String(material.id), material]));
    const materialsByName = new Map(state.materials.map((material) => [normalizeMaterialName(material.name), material]));
    const rows = records.map((record) => {
      const weight = Number(history.role === "partner" ? record.total_kg : record.quantity_kg);
      const material = history.role === "buyer" ? materialsById.get(String(record.material_id)) || materialsByName.get(normalizeMaterialName(record.material_name)) : null;
      const priceValue = record.price_per_kg;
      const price = priceValue === null || priceValue === void 0 || !Number.isFinite(Number(priceValue)) ? null : Number(priceValue);
      const totalValue = history.role === "buyer" ? record.total_value : null;
      const total = history.role === "buyer" ? totalValue === null || totalValue === void 0 || !Number.isFinite(Number(totalValue)) ? null : Number(totalValue) : price === null ? null : Math.round(weight * price * 100) / 100;
      return {
        id: record.id,
        date: record.created_at,
        material: record.material_name || material?.name || "Material n\xE3o identificado",
        weight: Number.isFinite(weight) ? weight : 0,
        price,
        total
      };
    });
    history.rows = rows;
    renderProfileHistory();
  } catch (error) {
    if (requestId !== state.profileRequest) return;
    $("#profile-records-body").innerHTML = `<tr><td colspan="6">Falha ao carregar os registros: ${escapeHtml(error.message || error)}</td></tr>`;
    $("#profile-export-pdf").disabled = false;
    toast(`N\xE3o foi poss\xEDvel atualizar o perfil: ${error.message || error}`, true);
  }
}
function renderProfileHistory() {
  const history = state.profileHistory;
  if (!history) return;
  const rows = history.rows;
  const weight = rows.reduce((sum, row) => sum + row.weight, 0);
  const pricedRows = rows.filter((row) => row.total !== null);
  const totalCents = pricedRows.reduce((sum, row) => sum + Math.round(row.total * 100), 0);
  const missingPrices = rows.length - pricedRows.length;
  $("#profile-record-count").textContent = formatNumber(rows.length, 0);
  $("#profile-total-weight").textContent = `${formatNumber(weight, 3)} kg`;
  $("#profile-total-value").textContent = rows.length && !pricedRows.length ? "\u2014" : `R$ ${(totalCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${missingPrices ? ` + ${missingPrices} sem pre\xE7o` : ""}`;
  $("#profile-value-note").textContent = history.role === "buyer" ? "Total salvo pelo administrador; n\xE3o h\xE1 c\xE1lculo de pontos para compradores." : "Calculado com o pre\xE7o por kg da pesagem.";
  $("#profile-export-pdf").disabled = false;
  const table = history.role === "partner" ? "weighings" : "orders";
  $("#profile-records-body").innerHTML = rows.map((row) => `<tr>
    <td>${escapeHtml(new Date(row.date).toLocaleDateString("pt-BR"))}</td>
    <td>${escapeHtml(row.material)}</td>
    <td>${formatNumber(row.weight, 3)} kg</td>
    <td>${row.price === null ? "\u2014" : `R$ ${formatNumber(row.price, 2)}`}</td>
    <td>${row.total === null ? "\u2014" : `R$ ${formatNumber(row.total, 2)}`}</td>
    <td><button class="admin-icon-button" type="button" data-delete-profile-record data-delete-table="${table}" data-delete-id="${Number(row.id)}" aria-label="Excluir registro de ${escapeHtml(row.material)}" title="Excluir registro">${trashIcon()}</button></td>
  </tr>`).join("") || '<tr><td colspan="6">Nenhum registro encontrado para os filtros selecionados.</td></tr>';
}
function trashIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg>';
}
async function deleteProfileRecord(button) {
  const history = state.profileHistory;
  const table = button.dataset.deleteTable;
  const id = button.dataset.deleteId;
  const expectedTable = history?.role === "partner" ? "weighings" : "orders";
  if (!history || table !== expectedTable || !/^\d+$/.test(id || "")) {
    toast("Registro inv\xE1lido para exclus\xE3o.", true);
    return;
  }
  const message = history.role === "partner" ? "Excluir esta pesagem? Os Pontos Verdes correspondentes ser\xE3o removidos automaticamente do saldo do parceiro." : "Excluir este pedido? Esta a\xE7\xE3o n\xE3o pode ser desfeita.";
  if (!window.confirm(message)) return;
  button.disabled = true;
  try {
    const { data, error } = await supabase.from(table).delete().eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Nenhum registro foi exclu\xEDdo. Verifique as permiss\xF5es administrativas.");
    const foreignKey = history.role === "partner" ? "partner_id" : "buyer_id";
    let dateRows;
    try {
      dateRows = await fetchAll(() => supabase.from(table).select("id,created_at").eq(foreignKey, history.profile.id).order("created_at").order("id"));
    } catch (datesError) {
      toast(`Registro exclu\xEDdo, mas n\xE3o foi poss\xEDvel atualizar os filtros do perfil: ${datesError.message || datesError}`, true);
      await Promise.all([loadProfileHistory(), loadOverview(), loadOperations()]);
      return;
    }
    if (state.profileHistory !== history) return;
    history.dateKeys = [...new Set(dateRows.map((row) => dateKey(row.created_at)).filter(Boolean))].sort();
    updateProfileFilterOptions();
    toast(history.role === "partner" ? "Pesagem exclu\xEDda; a trigger do banco atualizou o saldo da carteira." : "Pedido exclu\xEDdo.");
    await Promise.all([
      loadProfileHistory(),
      loadOverview(),
      loadOperations(),
      history.role === "partner" ? loadMaterials() : Promise.resolve()
    ]);
  } catch (error) {
    button.disabled = false;
    toast(`N\xE3o foi poss\xEDvel excluir o registro: ${error.message || error}`, true);
  }
}
function selectedProfilePeriodLabel() {
  const year = $("#profile-filter-year").value;
  const month = $("#profile-filter-month").value;
  const week = $("#profile-filter-week").value;
  if (!year) return "Todo o per\xEDodo";
  if (week) return `Semana ${String(week).padStart(2, "0")} de ${year}${month ? ` \xB7 ${new Date(Date.UTC(2020, Number(month) - 1, 1)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" })}` : ""}`;
  if (month) return `${new Date(Date.UTC(2020, Number(month) - 1, 1)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" })} de ${year}`;
  return `Ano ${year}`;
}
function safeFilename(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cliente";
}
function exportProfilePdf() {
  const history = state.profileHistory;
  if (!history) {
    toast("Abra o perfil de um cliente antes de gerar o relat\xF3rio.", true);
    return;
  }
  const JsPDF = window.jspdf?.jsPDF;
  if (!JsPDF) {
    toast("A biblioteca de PDF n\xE3o foi carregada. Atualize a p\xE1gina e tente novamente.", true);
    return;
  }
  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const period = selectedProfilePeriodLabel();
  const customerType = history.role === "partner" ? "Condom\xEDnio / parceiro" : "Ferro-velho / comprador";
  const pricedRows = history.rows.filter((row) => row.total !== null);
  const totalCents = pricedRows.reduce((sum, row) => sum + Math.round(row.total * 100), 0);
  const weight = history.rows.reduce((sum, row) => sum + row.weight, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(8, 86, 39);
  doc.text("ReciclaDin", 14, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(75, 88, 78);
  doc.text("Relat\xF3rio individual de opera\xE7\xF5es", 14, 23);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(25, 38, 29);
  doc.text(`${customerType}: ${history.profile.full_name || "Sem nome"}`, 14, 32);
  doc.setFont("helvetica", "normal");
  doc.text(`Per\xEDodo: ${period}`, 14, 38);
  autoTable(doc, {
    startY: 45,
    head: [["Data", "Material", "Peso (kg)", "Pre\xE7o unit\xE1rio (R$/kg)", "Valor lan\xE7ado (R$)"]],
    body: history.rows.map((row) => [
      new Date(row.date).toLocaleDateString("pt-BR"),
      row.material,
      formatNumber(row.weight, 3),
      row.price === null ? "\u2014" : formatNumber(row.price, 2),
      row.total === null ? "\u2014" : formatNumber(row.total, 2)
    ]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5, textColor: [35, 48, 39] },
    headStyles: { fillColor: [10, 83, 40], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [242, 248, 243] },
    columnStyles: { 0: { cellWidth: 27 }, 1: { cellWidth: 72 }, 2: { cellWidth: 30, halign: "right" }, 3: { cellWidth: 45, halign: "right" }, 4: { cellWidth: 48, halign: "right" } },
    didDrawPage: () => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 102);
      doc.text("ReciclaDin \xB7 Relat\xF3rio administrativo", 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`P\xE1gina ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
    }
  });
  const summaryY = (doc.lastAutoTable?.finalY || 45) + 10;
  const summaryText = `Peso total: ${formatNumber(weight, 3)} kg     Valor lan\xE7ado: R$ ${(totalCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${history.rows.length > pricedRows.length ? ` \xB7 ${history.rows.length - pricedRows.length} registro(s) sem valor` : ""}`;
  if (summaryY < doc.internal.pageSize.getHeight() - 16) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(8, 86, 39);
    doc.text(summaryText, 14, summaryY);
  } else {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(8, 86, 39);
    doc.text(summaryText, 14, 18);
  }
  if (history.role === "buyer") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(85, 92, 87);
    const noteY = summaryY < doc.internal.pageSize.getHeight() - 16 ? summaryY + 6 : 24;
    doc.text("Valores do comprador correspondem aos totais salvos no lan\xE7amento administrativo.", 14, noteY);
  }
  const filename = `relatorio-${safeFilename(history.profile.full_name)}-${safeFilename(period)}.pdf`;
  doc.save(filename);
}
async function loadMaterials() {
  const body = $("#materials-body");
  try {
    const [materials, weighings] = await Promise.all([
      fetchAll(() => supabase.from("materials").select("id,name,unit,reference_price,active").order("name").order("id")),
      fetchAll(() => supabase.from("weighings").select("material_name,total_kg").order("id"))
    ]);
    state.materials = materials;
    const materialSelect = $("#manual-material");
    const selectedMaterial = materialSelect.value;
    materialSelect.innerHTML = '<option value="">Selecione um material...</option>' + materials.filter((material) => material.active).map((material) => `<option value="${Number(material.id)}">${escapeHtml(material.name)}</option>`).join("");
    if (materials.some((material) => material.active && String(material.id) === selectedMaterial)) materialSelect.value = selectedMaterial;
    const orderMaterialSelect = $("#order-material");
    const selectedOrderMaterial = orderMaterialSelect.value;
    orderMaterialSelect.innerHTML = '<option value="">Selecione um material ativo...</option>' + materials.filter((material) => material.active).map((material) => `<option value="${Number(material.id)}">${escapeHtml(material.name)}</option>`).join("");
    if (materials.some((material) => material.active && String(material.id) === selectedOrderMaterial)) orderMaterialSelect.value = selectedOrderMaterial;
    const totals = weighings.reduce((map, row) => {
      const name = row.material_name || "Material n\xE3o identificado";
      map.set(name, (map.get(name) || 0) + Number(row.total_kg || 0));
      return map;
    }, /* @__PURE__ */ new Map());
    $("#material-count").textContent = formatNumber(materials.length, 0);
    body.innerHTML = materials.map((material) => `<tr data-material-id="${Number(material.id)}">
      <td class="material-name">${escapeHtml(material.name)}</td><td class="material-unit">${escapeHtml(material.unit)}</td>
      <td class="material-price">R$ ${formatNumber(material.reference_price, 2)}</td>
      <td>${formatNumber(totals.get(material.name) || 0)} kg</td>
      <td><button class="admin-status-button ${material.active ? "active" : ""}" data-action="toggle" type="button">${material.active ? "Ativo" : "Inativo"}</button></td>
      <td><div class="admin-row-actions"><button type="button" data-action="edit">Editar</button><button type="button" class="danger" data-action="delete" title="Excluir material do cat\xE1logo" aria-label="Excluir ${escapeHtml(material.name)} do cat\xE1logo">Excluir material</button></div></td>
    </tr>`).join("") || '<tr><td colspan="6">Nenhum material cadastrado.</td></tr>';
  } catch (error) {
    body.innerHTML = `<tr><td colspan="6">N\xE3o foi poss\xEDvel carregar o cat\xE1logo: ${escapeHtml(error.message || error)}</td></tr>`;
    toast(`Falha ao carregar materiais: ${error.message || error}`, true);
  }
}
function updateAdminOrderPrice() {
  const material = state.materials.find((item) => String(item.id) === $("#order-material").value && item.active);
  if (material) $("#order-price").value = Number(material.reference_price || 0).toFixed(2);
  updateAdminOrderTotal();
}
function updateAdminOrderTotal() {
  const quantity = Number($("#order-quantity").value);
  const price = Number($("#order-price").value);
  const total = Number.isFinite(quantity) && quantity > 0 && Number.isFinite(price) && price >= 0 ? Math.round(quantity * price * 100) / 100 : 0;
  $("#order-total").textContent = `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
async function saveAdminOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const buyerId = $("#order-buyer").value;
  const material = state.materials.find((item) => String(item.id) === $("#order-material").value && item.active);
  const quantity = Number($("#order-quantity").value);
  const price = Number($("#order-price").value);
  const status = $("#order-status").value;
  if (!state.buyers.some((buyer) => buyer.id === buyerId) || !material || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0 || !state.buyers.find((buyer) => buyer.id === buyerId)?.is_active || !["solicitado", "em_andamento", "concluido", "cancelado"].includes(status)) {
    toast("Selecione um comprador, material ativo, quantidade, pre\xE7o e status v\xE1lidos.", true);
    return;
  }
  const total = Math.round(quantity * price * 100) / 100;
  button.disabled = true;
  button.textContent = "Registrando...";
  try {
    const { data: savedOrder, error } = await supabase.from("orders").insert({
      buyer_id: buyerId,
      created_by: state.user.id,
      material_id: material.id,
      material_name: material.name,
      quantity_kg: quantity,
      price_per_kg: price,
      total_value: total,
      status
    }).select("id,buyer_id,created_by,material_name,quantity_kg,price_per_kg,total_value,status,created_at").single();
    if (error) throw error;
    if (!savedOrder || savedOrder.buyer_id !== buyerId || savedOrder.created_by !== state.user.id) {
      throw new Error("O lan\xE7amento n\xE3o foi confirmado para o comprador selecionado. Atualize as migra\xE7\xF5es de permiss\xF5es do Supabase.");
    }
    form.reset();
    $("#order-total").textContent = "R$ 0,00";
    toast(`Transa\xE7\xE3o #${savedOrder.id} registrada para ${state.buyers.find((buyer) => buyer.id === buyerId)?.full_name || "o comprador selecionado"}.`);
    await Promise.all([loadOperations(), loadOverview(), loadPeople()]);
  } catch (error) {
    toast(`N\xE3o foi poss\xEDvel registrar a transa\xE7\xE3o: ${error.message || error}`, true);
  } finally {
    button.disabled = false;
    button.innerHTML = "Registrar transa\xE7\xE3o <span>\u2192</span>";
  }
}
function updateManualTotal() {
  const weight = Number($("#manual-weight").value);
  const price = Number($("#manual-price").value);
  const total = Number.isFinite(weight) && weight > 0 && Number.isFinite(price) && price >= 0 ? weight * price : 0;
  $("#manual-total").textContent = `R$ ${total.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const points = Number.isFinite(weight) && weight > 0 ? Math.round(weight * 10 * 100) / 100 : 0;
  $("#manual-points").textContent = `${formatNumber(points, 2)} Pontos Verdes \xB7 10 por kg`;
}
function syncManualMaterialPrice(event) {
  const materialId = $("#manual-material").value;
  const material = state.materials.find((item) => String(item.id) === materialId && item.active);
  if (material && event?.target?.id === "manual-material") $("#manual-price").value = Number(material.reference_price || 0).toFixed(2);
  updateManualTotal();
}
async function saveManualWeighing(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const partnerId = $("#manual-partner").value;
  const materialId = $("#manual-material").value;
  const totalKg = Number($("#manual-weight").value);
  const pricePerKg = Number($("#manual-price").value);
  if (!partnerId || !materialId || !Number.isFinite(totalKg) || totalKg <= 0 || !Number.isFinite(pricePerKg) || pricePerKg < 0) {
    toast("Selecione o parceiro e informe material, peso e pre\xE7o v\xE1lidos.", true);
    return;
  }
  const material = state.materials.find((item) => String(item.id) === materialId && item.active);
  if (!material) {
    toast("Selecione um material ativo do cat\xE1logo.", true);
    return;
  }
  const materialName = material.name;
  button.disabled = true;
  button.innerHTML = "Salvando pesagem...";
  try {
    const { error } = await supabase.from("weighings").insert({
      partner_id: partnerId,
      material_id: material.id,
      material_name: materialName,
      total_kg: totalKg,
      price_per_kg: pricePerKg
    });
    if (error) throw error;
    const points = Math.round(totalKg * 10 * 100) / 100;
    form.reset();
    $("#manual-total").textContent = "R$ 0,00";
    $("#manual-points").textContent = "0 Pontos Verdes \xB7 10 por kg";
    toast(`Pesagem cadastrada. Total: R$ ${(totalKg * pricePerKg).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}; ${formatNumber(points, 2)} Pontos Verdes creditados.`);
    await Promise.all([loadOperations(), loadOverview(), loadMaterials()]);
  } catch (error) {
    toast(`N\xE3o foi poss\xEDvel cadastrar a pesagem: ${error.message || error}`, true);
  } finally {
    button.disabled = false;
    button.innerHTML = "Cadastrar Material <span>\u2192</span>";
  }
}
function operationIsActive(status) {
  const normalized = String(status || "").trim().toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return !["cancelada", "cancelado", "concluida", "concluido", "finalizada", "finalizado", "entregue"].includes(normalized);
}
async function loadOperations() {
  const body = $("#operations-body");
  body.innerHTML = '<tr><td colspan="8">Atualizando registros operacionais...</td></tr>';
  try {
    const chartStart = /* @__PURE__ */ new Date();
    chartStart.setHours(0, 0, 0, 0);
    chartStart.setDate(chartStart.getDate() - 29);
    const [collectionsResult, ordersResult, weighingsResult, chartWeighings] = await Promise.all([
      supabase.from("collections").select("id,partner_id,type,requested_date,status").order("requested_date", { ascending: false }).order("id", { ascending: false }).limit(100),
      supabase.from("orders").select("id,buyer_id,material_name,quantity_kg,total_value,status,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100),
      supabase.from("weighings").select("id,partner_id,material_name,total_kg,price_per_kg,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(100),
      fetchAll(() => supabase.from("weighings").select("total_kg,created_at").gte("created_at", chartStart.toISOString()).order("created_at", { ascending: true }))
    ]);
    const recordsError = [collectionsResult, ordersResult, weighingsResult].find((result) => result.error)?.error;
    if (recordsError) throw recordsError;
    const collections = collectionsResult.data || [];
    const orders = ordersResult.data || [];
    const weighings = weighingsResult.data || [];
    const profileIds = [.../* @__PURE__ */ new Set([
      ...collections.map((row) => row.partner_id),
      ...orders.map((row) => row.buyer_id),
      ...weighings.map((row) => row.partner_id)
    ])];
    const profilesResult = profileIds.length ? await fetchAll(() => supabase.from("profiles").select("id,full_name").in("id", profileIds).order("id")) : [];
    const names = new Map(profilesResult.map((profile) => [profile.id, profile.full_name || "Sem nome"]));
    const entries = [
      ...collections.filter((row) => operationIsActive(row.status)).map((row) => ({
        table: "collections",
        id: row.id,
        type: "Coleta",
        date: row.requested_date,
        person: names.get(row.partner_id) || "Parceiro",
        material: row.type || "Material recicl\xE1vel",
        quantity: "Agendada",
        amount: "\u2014",
        status: row.status || "Solicitada"
      })),
      ...orders.filter((row) => operationIsActive(row.status)).map((row) => ({
        table: "orders",
        id: row.id,
        type: "Venda",
        date: row.created_at,
        person: names.get(row.buyer_id) || "Comprador",
        material: row.material_name || "Material",
        quantity: `${formatNumber(row.quantity_kg)} kg`,
        amount: row.total_value === null ? "\u2014" : `R$ ${formatNumber(row.total_value, 2)}`,
        status: row.status || "Solicitado"
      })),
      ...weighings.map((row) => ({
        table: "weighings",
        id: row.id,
        type: "Pesagem",
        date: row.created_at,
        person: names.get(row.partner_id) || "Parceiro",
        material: row.material_name || "Material",
        quantity: `${formatNumber(row.total_kg)} kg`,
        amount: `R$ ${(Number(row.total_kg || 0) * Number(row.price_per_kg || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: "Registrada"
      }))
    ].sort((left, right) => dateKey(right.date).localeCompare(dateKey(left.date))).slice(0, 150);
    body.innerHTML = entries.map((row) => `<tr>
      <td><span class="admin-record-type">${escapeHtml(row.type)}</span></td>
      <td>${escapeHtml(row.date ? (/* @__PURE__ */ new Date(`${dateKey(row.date)}T00:00:00`)).toLocaleDateString("pt-BR") : "\u2014")}</td>
      <td>${escapeHtml(row.person)}</td><td>${escapeHtml(row.material)}</td>
      <td>${escapeHtml(row.quantity)}</td><td class="admin-record-total">${escapeHtml(row.amount)}</td>
      <td><span class="admin-live-status">${escapeHtml(row.status)}</span></td>
      <td><button class="admin-icon-button" type="button" data-delete-table="${row.table}" data-delete-id="${escapeHtml(row.id)}" aria-label="Excluir ${escapeHtml(row.type.toLocaleLowerCase("pt-BR"))} de ${escapeHtml(row.person)}" title="Excluir registro">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6"/></svg>
      </button></td>
    </tr>`).join("") || '<tr><td colspan="8">Nenhuma coleta ou pedido em andamento.</td></tr>';
    const liveEntries = entries.filter((row) => row.type === "Coleta" || row.type === "Venda").slice(0, 8);
    $("#live-monitor").innerHTML = liveEntries.map((row) => `<article class="admin-live-row">
      <span class="admin-live-type">${escapeHtml(row.type)}</span>
      <span><strong>${escapeHtml(row.person)} \xB7 ${escapeHtml(row.material)}</strong><small>${escapeHtml(row.date ? (/* @__PURE__ */ new Date(`${dateKey(row.date)}T00:00:00`)).toLocaleDateString("pt-BR") : "Sem data")} \xB7 ${escapeHtml(row.quantity)}</small></span>
      <span class="admin-live-status">${escapeHtml(row.status)}</span>
    </article>`).join("") || '<p class="admin-empty">Nenhum agendamento ou pedido em andamento.</p>';
    renderAccumulationChart(chartWeighings);
    $("#monitor-status").textContent = state.monitorLive ? "Tempo real conectado" : "Sincroniza\xE7\xE3o peri\xF3dica";
  } catch (error) {
    body.innerHTML = `<tr><td colspan="8">Falha ao carregar atividade: ${escapeHtml(error.message || error)}</td></tr>`;
    $("#monitor-status").textContent = "Falha na conex\xE3o";
    toast(`N\xE3o foi poss\xEDvel atualizar coletas e pedidos: ${error.message || error}`, true);
  }
}
function renderAccumulationChart(weighings) {
  const chart = $("#accumulation-chart");
  const days = [];
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  for (let offset = 29; offset >= 0; offset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    days.push({ key: dateInputValue(date), label: String(date.getDate()), kg: 0, accumulated: 0 });
  }
  const byDate = new Map(days.map((day) => [day.key, day]));
  weighings.forEach((row) => {
    const day = byDate.get(dateKey(row.created_at));
    if (day) day.kg += Number(row.total_kg || 0);
  });
  let total = 0;
  days.forEach((day) => {
    total += day.kg;
    day.accumulated = total;
  });
  $("#accumulation-total").textContent = `${formatNumber(total)} kg`;
  $("#accumulation-caption").textContent = `${formatNumber(weighings.reduce((sum, row) => sum + Number(row.total_kg || 0), 0))} kg no hist\xF3rico carregado \xB7 acumulado nos \xFAltimos 30 dias`;
  const width = 760, height = 210, left = 42, right = 12, top = 16, bottom = 26;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const max = Math.max(1, ...days.map((day) => day.accumulated));
  const points = days.map((day, index) => ({
    x: left + (days.length < 2 ? 0 : index / (days.length - 1) * plotWidth),
    y: top + plotHeight - day.accumulated / max * plotHeight
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},${(top + plotHeight).toFixed(1)} L${points[0].x.toFixed(1)},${(top + plotHeight).toFixed(1)} Z`;
  const grid = [0, 0.5, 1].map((ratio) => {
    const y = top + plotHeight * (1 - ratio);
    return `<line class="accumulation-grid" x1="${left}" y1="${y.toFixed(1)}" x2="${width - right}" y2="${y.toFixed(1)}"/><text x="${left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end">${formatNumber(max * ratio)}</text>`;
  }).join("");
  const labels = days.filter((_, index) => index % 5 === 0 || index === days.length - 1).map((day) => {
    const index = days.indexOf(day);
    return `<text x="${points[index].x.toFixed(1)}" y="${height - 5}" text-anchor="middle">${day.label}</text>`;
  }).join("");
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Peso acumulado de ${formatNumber(total)} quilogramas nos \xFAltimos 30 dias"><defs><linearGradient id="admin-accumulation-gradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#39f77c" stop-opacity=".35"/><stop offset="100%" stop-color="#39f77c" stop-opacity="0"/></linearGradient></defs>${grid}<path class="accumulation-area" d="${area}"/><path class="accumulation-line" d="${line}"/>${labels}</svg>`;
}
function scheduleMonitorRefresh() {
  clearTimeout(state.monitorTimeout);
  state.monitorTimeout = setTimeout(() => {
    refreshMonitor();
  }, 450);
}
function refreshMonitor() {
  if (document.hidden) return;
  void Promise.all([loadOperations(), loadOverview()]);
}
function startMonitorFallback() {
  if (state.monitorTimer) return;
  state.monitorTimer = setInterval(refreshMonitor, 3e4);
}
function stopMonitorFallback() {
  clearInterval(state.monitorTimer);
  state.monitorTimer = null;
}
function scheduleWalletRefresh() {
  if (!$("#admin-wallet").classList.contains("active")) return;
  clearTimeout(state.walletTimeout);
  state.walletTimeout = setTimeout(loadWallets, 450);
}
function subscribeToOperations() {
  state.monitorChannel = supabase.channel("admin-operations-monitor").on("postgres_changes", { event: "*", schema: "public", table: "collections" }, scheduleMonitorRefresh).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleMonitorRefresh).on("postgres_changes", { event: "*", schema: "public", table: "weighings" }, scheduleMonitorRefresh).on("postgres_changes", { event: "*", schema: "public", table: "green_wallet" }, scheduleWalletRefresh).on("postgres_changes", { event: "*", schema: "public", table: "benefit_redemptions" }, scheduleWalletRefresh).subscribe((status) => {
    if (status === "SUBSCRIBED") {
      state.monitorLive = true;
      stopMonitorFallback();
      $("#monitor-status").textContent = "Tempo real conectado";
      refreshMonitor();
    }
    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      state.monitorLive = false;
      $("#monitor-status").textContent = "Sincroniza\xE7\xE3o peri\xF3dica";
      startMonitorFallback();
    }
  });
}
async function deleteOperationRecord(button) {
  const table = button.dataset.deleteTable;
  const id = button.dataset.deleteId;
  if (!["collections", "orders", "weighings"].includes(table) || !/^\d+$/.test(id || "")) {
    toast("Registro inv\xE1lido para exclus\xE3o.", true);
    return;
  }
  if (!window.confirm("Excluir este registro operacional? Esta a\xE7\xE3o n\xE3o pode ser desfeita.")) return;
  button.disabled = true;
  try {
    const { data, error } = await supabase.from(table).delete().eq("id", id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Nenhum registro foi exclu\xEDdo. Verifique as permiss\xF5es administrativas.");
    toast("Registro exclu\xEDdo.");
    await Promise.all([loadOperations(), loadOverview(), table === "weighings" ? loadMaterials() : Promise.resolve()]);
  } catch (error) {
    button.disabled = false;
    toast(`N\xE3o foi poss\xEDvel excluir o registro: ${error.message || error}`, true);
  }
}
async function saveMaterial(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');
  const payload = {
    name: $("#material-name").value.trim(),
    unit: $("#material-unit").value.trim(),
    reference_price: Number($("#material-price").value),
    active: true
  };
  if (!payload.name || !payload.unit || !Number.isFinite(payload.reference_price) || payload.reference_price < 0) {
    toast("Informe nome, unidade e pre\xE7o v\xE1lidos.", true);
    return;
  }
  button.disabled = true;
  try {
    const { error } = await supabase.from("materials").insert(payload);
    if (error) throw error;
    form.reset();
    $("#material-unit").value = "kg";
    toast("Material cadastrado.");
    await loadMaterials();
    loadOverview();
  } catch (error) {
    toast(`N\xE3o foi poss\xEDvel cadastrar o material: ${error.message || error}`, true);
  } finally {
    button.disabled = false;
  }
}
function beginMaterialEdit(row, material) {
  row.innerHTML = `<td><input class="admin-inline-input edit-name" maxlength="100" aria-label="Nome" value="${escapeHtml(material.name)}"></td>
    <td><input class="admin-inline-input edit-unit" maxlength="20" aria-label="Unidade" value="${escapeHtml(material.unit)}"></td>
    <td><input class="admin-inline-input edit-price" type="number" min="0" step="0.01" aria-label="Pre\xE7o" value="${Number(material.reference_price)}"></td>
    <td></td><td>${material.active ? "Ativo" : "Inativo"}</td>
    <td><div class="admin-row-actions"><button type="button" data-action="save">Salvar</button><button type="button" data-action="cancel">Cancelar</button></div></td>`;
}
async function handleMaterialAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const row = button.closest("tr");
  const material = state.materials.find((item) => Number(item.id) === Number(row.dataset.materialId));
  if (!material) return;
  const action = button.dataset.action;
  if (action === "edit") return beginMaterialEdit(row, material);
  if (action === "cancel") return loadMaterials();
  if (action === "save") {
    const payload = {
      name: row.querySelector(".edit-name").value.trim(),
      unit: row.querySelector(".edit-unit").value.trim(),
      reference_price: Number(row.querySelector(".edit-price").value)
    };
    if (!payload.name || !payload.unit || !Number.isFinite(payload.reference_price) || payload.reference_price < 0) {
      toast("Informe nome, unidade e pre\xE7o v\xE1lidos.", true);
      return;
    }
    button.disabled = true;
    const { error } = await supabase.from("materials").update(payload).eq("id", material.id);
    if (error) {
      button.disabled = false;
      toast(`N\xE3o foi poss\xEDvel salvar o material: ${error.message}`, true);
      return;
    }
    toast("Material atualizado.");
    await loadMaterials();
    return;
  }
  if (action === "toggle") {
    const { error } = await supabase.from("materials").update({ active: !material.active }).eq("id", material.id);
    if (error) return toast(`N\xE3o foi poss\xEDvel alterar o status: ${error.message}`, true);
    await loadMaterials();
    return;
  }
  if (action === "delete") {
    if (!window.confirm(`Excluir permanentemente "${material.name}"? O hist\xF3rico das pesagens e dos pedidos ser\xE1 mantido sem o v\xEDnculo ao material.`)) return;
    button.disabled = true;
    const { error } = await supabase.rpc("delete_material_preserving_history", { p_material_id: material.id });
    if (error) {
      button.disabled = false;
      toast(`N\xE3o foi poss\xEDvel excluir o material. Verifique se a migra\xE7\xE3o administrativa foi aplicada: ${error.message}`, true);
      return;
    }
    toast("Material exclu\xEDdo; hist\xF3rico preservado.");
    await loadMaterials();
    loadOverview();
  }
}
async function loadReport() {
  if (!state.profile) return;
  const requestId = ++state.reportRequest;
  try {
    const range = reportRange();
    const fromTime = (/* @__PURE__ */ new Date(`${range.start}T00:00:00`)).toISOString();
    const toTime = (/* @__PURE__ */ new Date(`${range.end}T00:00:00`)).toISOString();
    const timeQuery = (table, fields, column) => () => supabase.from(table).select(fields).gte(column, fromTime).lt(column, toTime).order("id");
    const dateQuery = (table, fields, column) => () => supabase.from(table).select(fields).gte(column, range.start).lt(column, range.end).order("id");
    const [profiles, orders, collections, weighings, oil] = await Promise.all([
      fetchAll(() => supabase.from("profiles").select("id,full_name,role").in("role", ["buyer", "partner"]).order("id")),
      fetchAll(timeQuery("orders", "id,buyer_id,created_at,quantity_kg,material_name,status", "created_at")),
      fetchAll(dateQuery("collections", "id,partner_id,requested_date,type,status", "requested_date")),
      fetchAll(timeQuery("weighings", "id,partner_id,created_at,total_kg,material_name", "created_at")),
      fetchAll(timeQuery("oil_collections", "id,partner_id,created_at,liters,status", "created_at"))
    ]);
    if (requestId !== state.reportRequest) return;
    state.report = { range, profiles, orders, collections, weighings, oil };
    renderReport();
  } catch (error) {
    if (requestId !== state.reportRequest) return;
    state.report = null;
    $("#report-chart").innerHTML = `<p>Falha ao carregar relat\xF3rio: ${escapeHtml(error.message || error)}</p>`;
    toast(`N\xE3o foi poss\xEDvel gerar o relat\xF3rio: ${error.message || error}`, true);
  }
}
function renderReport() {
  if (!state.report) return;
  const data = state.report;
  const buyerSearch = $("#report-buyer").value.trim().toLocaleLowerCase("pt-BR");
  const partnerSearch = $("#report-partner").value.trim().toLocaleLowerCase("pt-BR");
  const buyerIds = new Set(data.profiles.filter((profile) => profile.role === "buyer" && (!buyerSearch || (profile.full_name || "").toLocaleLowerCase("pt-BR").includes(buyerSearch))).map((profile) => profile.id));
  const partnerIds = new Set(data.profiles.filter((profile) => profile.role === "partner" && (!partnerSearch || (profile.full_name || "").toLocaleLowerCase("pt-BR").includes(partnerSearch))).map((profile) => profile.id));
  const orders = data.orders.filter((row) => buyerIds.has(row.buyer_id));
  const collections = data.collections.filter((row) => partnerIds.has(row.partner_id));
  const weighings = data.weighings.filter((row) => partnerIds.has(row.partner_id));
  const oil = data.oil.filter((row) => partnerIds.has(row.partner_id));
  const weight = weighings.reduce((sum, row) => sum + Number(row.total_kg || 0), 0);
  const liters = oil.reduce((sum, row) => sum + Number(row.liters || 0), 0);
  $("#report-orders").textContent = formatNumber(orders.length, 0);
  $("#report-collections").textContent = formatNumber(collections.length, 0);
  $("#report-weighings").textContent = formatNumber(weighings.length, 0);
  $("#report-weight").textContent = `${formatNumber(weight)} kg`;
  $("#report-oil").textContent = `${formatNumber(liters)} L`;
  $("#report-caption").textContent = data.range.mode === "year" ? `Ano ${data.range.start.slice(0, 4)}` : data.range.mode === "month" ? `M\xEAs ${data.range.start.slice(0, 7)}` : `Dia ${(/* @__PURE__ */ new Date(`${data.range.start}T00:00:00`)).toLocaleDateString("pt-BR")}`;
  const groups = makeGroups(data.range);
  const groupKey = (value) => {
    const key = dateKey(value);
    return data.range.mode === "year" ? key.slice(0, 7) : data.range.mode === "month" ? key : data.range.start;
  };
  orders.forEach((row) => {
    const group = groups.get(groupKey(row.created_at));
    if (group) group.orders++;
  });
  collections.forEach((row) => {
    const group = groups.get(groupKey(row.requested_date));
    if (group) group.collections++;
  });
  weighings.forEach((row) => {
    const group = groups.get(groupKey(row.created_at));
    if (group) {
      group.weighings++;
      group.weight += Number(row.total_kg || 0);
    }
  });
  oil.forEach((row) => {
    const group = groups.get(groupKey(row.created_at));
    if (group) group.oil += Number(row.liters || 0);
  });
  const rows = [...groups.values()];
  const materialTotals = weighings.reduce((map, row) => {
    const name = row.material_name || "Material n\xE3o identificado";
    map.set(name, (map.get(name) || 0) + Number(row.total_kg || 0));
    return map;
  }, /* @__PURE__ */ new Map());
  $("#report-materials").innerHTML = [...materialTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name, kg]) => `<tr><td>${escapeHtml(name)}</td><td>${formatNumber(kg)} kg</td></tr>`).join("") || '<tr><td colspan="2">Sem pesagens no per\xEDodo selecionado.</td></tr>';
  $("#report-details").innerHTML = rows.map((row) => `<tr><td>${escapeHtml(row.label)}</td><td>${row.orders}</td><td>${row.collections}</td><td>${row.weighings}</td><td>${formatNumber(row.weight)}</td><td>${formatNumber(row.oil)}</td></tr>`).join("");
  $("#report-row-count").textContent = `${orders.length + collections.length + weighings.length + oil.length} registros`;
  data.filtered = { orders, collections, weighings, oil, rows, materialTotals };
  drawChart(rows);
}
function makeGroups(range) {
  const groups = /* @__PURE__ */ new Map();
  const add = (key, label) => groups.set(key, { key, label, orders: 0, collections: 0, weighings: 0, weight: 0, oil: 0 });
  if (range.mode === "year") {
    for (let month = 1; month <= 12; month++) {
      const key = `${range.start.slice(0, 4)}-${String(month).padStart(2, "0")}`;
      add(key, new Date(Date.UTC(Number(range.start.slice(0, 4)), month - 1, 1)).toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" }));
    }
  } else if (range.mode === "month") {
    const [year, month] = range.start.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    for (let day = 1; day <= lastDay; day++) {
      const key = `${range.start.slice(0, 7)}-${String(day).padStart(2, "0")}`;
      add(key, String(day));
    }
  } else {
    add(range.start, (/* @__PURE__ */ new Date(`${range.start}T00:00:00`)).toLocaleDateString("pt-BR"));
  }
  return groups;
}
function drawChart(rows) {
  const chart = $("#report-chart");
  const width = 960, height = 270, left = 42, right = 15, top = 18, bottom = 38;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const max = Math.max(1, ...rows.flatMap((row) => [row.orders, row.collections, row.weighings]));
  const step = plotWidth / Math.max(rows.length, 1);
  const barWidth = Math.max(1, Math.min(13, (step - 7) / 3));
  const colors = ["#347ce5", "#17a65a", "#eca633"];
  const rects = rows.flatMap((row, index) => [row.orders, row.collections, row.weighings].map((value, series) => {
    const barHeight = value / max * plotHeight;
    const x = left + index * step + (step - barWidth * 3) / 2 + series * barWidth;
    const y = top + plotHeight - barHeight;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(1, barWidth - 2).toFixed(1)}" height="${Math.max(value ? 2 : 0, barHeight).toFixed(1)}" rx="2" fill="${colors[series]}"><title>${escapeHtml(row.label)} \xB7 ${value}</title></rect>`;
  })).join("");
  const stride = Math.max(1, Math.ceil(rows.length / 12));
  const labels = rows.filter((row, index) => index % stride === 0 || index === rows.length - 1).map((row) => {
    const index = rows.indexOf(row);
    return `<text x="${(left + index * step + step / 2).toFixed(1)}" y="${height - 10}" text-anchor="middle">${escapeHtml(row.label)}</text>`;
  }).join("");
  const grid = [0, 0.5, 1].map((ratio) => {
    const y = top + plotHeight * (1 - ratio);
    return `<line class="grid-line" x1="${left}" y1="${y}" x2="${width - right}" y2="${y}"/><text x="${left - 8}" y="${y + 4}" text-anchor="end">${Math.round(max * ratio)}</text>`;
  }).join("");
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gr\xE1fico de pedidos, coletas e pesagens">${grid}${rects}${labels}</svg>`;
}
function asciiHex(value) {
  const safe = String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");
  return Array.from(safe, (char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("").toUpperCase();
}
function pdfDocument(streams) {
  const pageRefs = streams.map((_, index) => 5 + index * 2);
  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] /Count ${streams.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  streams.forEach((stream, index) => {
    const page = pageRefs[index];
    objects[page] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${page + 1} 0 R >>`;
    objects[page + 1] = `<< /Length ${stream.length} >>
stream
${stream}
endstream`;
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj
${objects[id]}
endobj
`;
  }
  const xref = pdf.length;
  pdf += `xref
0 ${objects.length}
0000000000 65535 f 
`;
  for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n 
`;
  pdf += `trailer
<< /Size ${objects.length} /Root 1 0 R >>
startxref
${xref}
%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}
function exportReportPdf() {
  if (!state.report?.filtered) return toast("Carregue um relat\xF3rio antes de exportar.", true);
  const data = state.report;
  const { rows, materialTotals } = data.filtered;
  const pages = [];
  let commands = [];
  let y = 0;
  const text = (value, x, baseline, size = 9, bold = false, color = "0.12 0.2 0.15") => {
    commands.push(`${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(1)} ${baseline.toFixed(1)} Td <${asciiHex(value).slice(0, 240)}> Tj ET`);
  };
  const line = (x1, y1, x2, y2) => commands.push(`0.87 0.91 0.88 RG 0.5 w ${x1} ${y1} m ${x2} ${y2} l S`);
  const rect = (x, baseline, width, height, color) => commands.push(`${color} rg ${x.toFixed(1)} ${baseline.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)} re f`);
  const finishPage = () => {
    pages.push(commands.join("\n"));
    commands = [];
  };
  const startPage = (title) => {
    if (commands.length) finishPage();
    text("ReciclaDin | Relatorio administrativo", 42, 805, 16, true, "0.05 0.42 0.2");
    text(title, 42, 783, 11, true);
    line(42, 774, 553, 774);
    y = 755;
  };
  startPage("Resumo e atividade operacional");
  text($("#report-caption").textContent, 42, y, 9);
  text(`Comprador: ${$("#report-buyer").value.trim() || "Todos"} | Parceiro: ${$("#report-partner").value.trim() || "Todos"}`, 42, y - 15, 8);
  const metrics = [
    ["Pedidos", $("#report-orders").textContent],
    ["Coletas", $("#report-collections").textContent],
    ["Pesagens", $("#report-weighings").textContent],
    ["Peso (kg)", $("#report-weight").textContent],
    ["Oleo (L)", $("#report-oil").textContent]
  ];
  metrics.forEach(([label, value], index) => {
    const x = 42 + index % 3 * 171;
    const baseline = y - 65 - Math.floor(index / 3) * 51;
    rect(x, baseline, 158, 39, "0.94 0.97 0.95");
    text(label, x + 8, baseline + 24, 8);
    text(value, x + 8, baseline + 8, 12, true, "0.05 0.42 0.2");
  });
  const chartTop = y - 142;
  const chartBottom = chartTop - 112;
  const chartLeft = 56, chartRight = 545, chartHeight = chartTop - chartBottom;
  const max = Math.max(1, ...rows.flatMap((row) => [row.orders, row.collections, row.weighings]));
  [0, 0.5, 1].forEach((ratio) => {
    const baseline = chartBottom + chartHeight * ratio;
    line(chartLeft, baseline, chartRight, baseline);
    text(String(Math.round(max * ratio)), 41, baseline - 3, 7);
  });
  const step = (chartRight - chartLeft) / Math.max(rows.length, 1);
  const barWidth = Math.max(1, Math.min(10, (step - 5) / 3));
  const colors = ["0.2 0.49 0.9", "0.08 0.63 0.35", "0.92 0.61 0.15"];
  rows.forEach((row, index) => {
    [row.orders, row.collections, row.weighings].forEach((value, series) => {
      const height = value / max * chartHeight;
      if (!height) return;
      const x = chartLeft + index * step + (step - barWidth * 3) / 2 + series * barWidth;
      rect(x, chartBottom, Math.max(1, barWidth - 1), height, colors[series]);
    });
    if (index % Math.max(1, Math.ceil(rows.length / 14)) === 0 || index === rows.length - 1) {
      text(row.label, chartLeft + index * step, chartBottom - 11, 7);
    }
  });
  text("Pedidos", 75, chartTop + 11, 8);
  rect(60, chartTop + 8, 8, 8, colors[0]);
  text("Coletas", 170, chartTop + 11, 8);
  rect(155, chartTop + 8, 8, 8, colors[1]);
  text("Pesagens", 265, chartTop + 11, 8);
  rect(250, chartTop + 8, 8, 8, colors[2]);
  startPage("Materiais e detalhamento por per\xEDodo");
  const table = (title, headers, dataRows, widths) => {
    const drawHeader = () => {
      text(title, 42, y, 11, true, "0.05 0.42 0.2");
      y -= 22;
      let x = 42;
      headers.forEach((header, index) => {
        text(header, x, y, 7, true);
        x += widths[index];
      });
      y -= 8;
      line(42, y, 553, y);
      y -= 14;
    };
    drawHeader();
    dataRows.forEach((row) => {
      if (y < 52) {
        startPage(`${title} (continuacao)`);
        drawHeader();
      }
      let x = 42;
      row.forEach((value, index) => {
        text(String(value), x, y, 7);
        x += widths[index];
      });
      line(42, y - 4, 553, y - 4);
      y -= 15;
    });
    y -= 20;
  };
  const materials = [...materialTotals.entries()].sort((a, b) => b[1] - a[1]);
  table("Volume pesado por material", ["Material", "Quantidade"], materials.length ? materials.map(([name, kg]) => [name, `${formatNumber(kg)} kg`]) : [["Sem pesagens no periodo", "0 kg"]], [320, 191]);
  table("Atividade por per\xEDodo", ["Data", "Pedidos", "Coletas", "Pesagens", "Kg", "Oleo L"], rows.map((row) => [row.label, row.orders, row.collections, row.weighings, formatNumber(row.weight), formatNumber(row.oil)]), [95, 65, 65, 65, 100, 121]);
  finishPage();
  const blob = pdfDocument(pages);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-recicladin-${data.range.start.replace(/-/g, "")}.pdf`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
initialize().catch((error) => toast(`N\xE3o foi poss\xEDvel abrir a \xE1rea administrativa: ${error.message || error}`, true));
