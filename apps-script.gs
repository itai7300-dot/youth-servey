/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        פורמלי — Google Apps Script Backend v2              ║
 * ║  Stores BOTH form definitions AND responses in Sheets      ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * SHEET STRUCTURE
 * ───────────────
 * Tab "_forms"    → one row per form (id, title, questions JSON …)
 * Tab "<formId>"  → one row per submission for that form
 *
 * API
 * ───
 *  GET  ?action=getForms                          → all form definitions
 *  GET  ?action=getForm&formId=xxx                → one form definition
 *  POST { action:"saveForm",       form:{…} }     → create / update form
 *  POST { action:"deleteForm",     formId:"xxx" } → delete form + responses
 *  POST { action:"submitResponse", formId, timestamp, answers:{} } → save response
 */

// ─── CONFIGURATION ────────────────────────────────────────────────
// Leave empty ('') to use the spreadsheet this script is bound to.
var SPREADSHEET_ID  = '';
var FORMS_SHEET_NAME = '_forms';
// ──────────────────────────────────────────────────────────────────

/* ── Helpers ── */
function getSpreadsheet() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function getFormsSheet() {
  var ss    = getSpreadsheet();
  var sheet = ss.getSheetByName(FORMS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(FORMS_SHEET_NAME);
    sheet.appendRow(['id','title','description','questions','eventMode','maxParticipants','closed','updatedAt']);
    var hdr = sheet.getRange(1,1,1,8);
    hdr.setFontWeight('bold').setBackground('#1A1A2E').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1,8);
  }
  return sheet;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function rowToForm(row) {
  var questions = [];
  try { questions = JSON.parse(row[3] || '[]'); } catch(e) {}
  return {
    id:              row[0],
    title:           row[1],
    description:     row[2],
    questions:       questions,
    eventMode:       row[4]==='TRUE' || row[4]===true,
    maxParticipants: parseInt(row[5]) || 0,
    closed:          row[6]==='TRUE' || row[6]===true,
    updatedAt:       row[7]
  };
}

/* ── doGet — read operations ── */
function doGet(e) {
  try {
    var action = (e.parameter && e.parameter.action) ? e.parameter.action : '';

    if (action === 'getForms') {
      return jsonOut({ success:true, forms: readAllForms() });
    }
    if (action === 'getForm') {
      var f = readForm(e.parameter.formId);
      return f ? jsonOut({success:true,form:f}) : jsonOut({success:false,error:'not found'});
    }
    // health check
    return jsonOut({ status:'ok', message:'פורמלי v2 פעיל ✅' });
  } catch(err) {
    return jsonOut({ success:false, error:err.message });
  }
}

/* ── doPost — write operations ── */
function doPost(e) {
  try {
    var data   = JSON.parse(e.postData ? e.postData.contents : '{}');
    var action = data.action || '';

    if (action === 'saveForm')       { saveForm(data.form);                             return jsonOut({success:true}); }
    if (action === 'deleteForm')     { deleteForm(data.formId);                         return jsonOut({success:true}); }
    if (action === 'submitResponse') { appendResponse(data.formId, data.timestamp, data.answers||{}); return jsonOut({success:true}); }

    return jsonOut({ success:false, error:'Unknown action: '+action });
  } catch(err) {
    return jsonOut({ success:false, error:err.message });
  }
}

/* ── Form CRUD ── */
function readAllForms() {
  var sheet = getFormsSheet();
  var last  = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2,1,last-1,8).getValues()
    .filter(function(r){ return r[0]; })
    .map(rowToForm);
}

function readForm(formId) {
  var sheet = getFormsSheet();
  var last  = sheet.getLastRow();
  if (last < 2) return null;
  var rows = sheet.getRange(2,1,last-1,8).getValues();
  for (var i=0;i<rows.length;i++) { if (rows[i][0]===formId) return rowToForm(rows[i]); }
  return null;
}

function saveForm(form) {
  var sheet = getFormsSheet();
  var last  = sheet.getLastRow();
  var targetRow = -1;
  if (last >= 2) {
    var ids = sheet.getRange(2,1,last-1,1).getValues();
    for (var i=0;i<ids.length;i++) { if (ids[i][0]===form.id) { targetRow=i+2; break; } }
  }
  var row = [
    form.id, form.title, form.description||'',
    JSON.stringify(form.questions||[]),
    form.eventMode?'TRUE':'FALSE',
    form.maxParticipants||0,
    form.closed?'TRUE':'FALSE',
    new Date().toLocaleString('he-IL')
  ];
  if (targetRow>0) sheet.getRange(targetRow,1,1,8).setValues([row]);
  else sheet.appendRow(row);
  sheet.autoResizeColumns(1,8);
}

function deleteForm(formId) {
  var sheet = getFormsSheet();
  var last  = sheet.getLastRow();
  if (last < 2) return;
  var ids = sheet.getRange(2,1,last-1,1).getValues();
  for (var i=0;i<ids.length;i++) {
    if (ids[i][0]===formId) { sheet.deleteRow(i+2); break; }
  }
  var ss = getSpreadsheet();
  var rs = ss.getSheetByName(formId);
  if (rs) ss.deleteSheet(rs);
}

/* ── Responses ── */
function appendResponse(formId, timestamp, answers) {
  var ss    = getSpreadsheet();
  var sheet = ss.getSheetByName(formId) || ss.insertSheet(formId);
  var labels = Object.keys(answers);

  if (sheet.getLastRow()===0) {
    var headers = ['Timestamp'].concat(labels);
    sheet.appendRow(headers);
    var hdr = sheet.getRange(1,1,1,headers.length);
    hdr.setFontWeight('bold').setBackground('#FF6B35').setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  var existing = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  labels.forEach(function(label) {
    if (existing.indexOf(label)===-1) {
      var col = sheet.getLastColumn()+1;
      sheet.getRange(1,col).setValue(label).setFontWeight('bold')
           .setBackground('#FF6B35').setFontColor('#FFFFFF');
      existing.push(label);
    }
  });

  var row = existing.map(function(h) {
    if (h==='Timestamp') return timestamp || new Date().toLocaleString('he-IL');
    return answers[h]!==undefined ? answers[h] : '';
  });
  sheet.appendRow(row);
}

/* ── Manual tests (run from editor) ── */
function testSaveForm() {
  saveForm({ id:'test123', title:'טופס בדיקה', description:'', questions:[
    {id:'q1',type:'text',label:'מה שמך?',required:true,options:[]},
    {id:'q2',type:'yesno',label:'האם תבוא?',required:false,options:[]}
  ], eventMode:false, maxParticipants:0, closed:false });
  Logger.log('saveForm OK');
}
function testGetForms() { Logger.log(JSON.stringify(readAllForms(),null,2)); }
function testSubmitResponse() {
  appendResponse('test123', new Date().toLocaleString('he-IL'), {'מה שמך?':'ישראל','האם תבוא?':'כן'});
  Logger.log('submitResponse OK');
}
function testDeleteForm() { deleteForm('test123'); Logger.log('deleteForm OK'); }
