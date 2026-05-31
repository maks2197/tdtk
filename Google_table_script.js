// === Google Apps Script (Бэкенд CRM + CMS + Заявки) ===
// Разворачивается как: Веб-приложение → Доступ: Все (Anyone)
// ВАЖНО: Скрипт должен быть привязан к таблице (Extensions → Apps Script)

const ADMIN_PASS = 'tdtk2026_secure'; // Замените на сложный пароль!
const SHEET_LEADS = 'Заявки';
const SHEET_CMS = 'CMS';

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_LEADS) {
      sheet.appendRow(['id','date','name','phone','street','house','entrance','apartment','total_apts','with_sub','status','comment']);
    } else if (name === SHEET_CMS) {
      sheet.appendRow(['key','section','value','type','updated_at']);
      const def = [
        ['hero_title','hero','Домофон для вашего подъезда','text',new Date()],
        ['price_min','hero','35000','number',new Date()],
        ['phone','contacts','+7 (000) 123-45-67','text',new Date()],
        ['base_price','pricing','70000','number',new Date()],
        ['sub_price','pricing','35000','number',new Date()],
        ['monthly_fee','pricing','200','number',new Date()],
        ['meta_desc','seo','Коллективная установка домофонов. Договор при 50% согласий.','text',new Date()]
      ];
      def.forEach(r => sheet.appendRow(r));
    }
  }
  return sheet;
}

function getData(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map(r => {
    const o = {}; headers.forEach((h,i) => o[h] = r[i]); return o;
  });
}

function calcEntranceStats(leads) {
  const map = {};
  leads.filter(l => l.status !== 'Отказ').forEach(l => {
    const key = `${l.street}|${l.house}|${l.entrance}`;
    if (!map[key]) map[key] = {addr:`${l.street}, д.${l.house}, п.${l.entrance}`, total:parseInt(l.total_apts)||1, agreed:new Set()};
    if (l.apartment) map[key].agreed.add(String(l.apartment));
  });
  return Object.values(map).map(m => {
    const pct = Math.round((m.agreed.size / m.total) * 100);    return { address: m.addr, total: m.total, agreed: m.agreed.size, percent: pct, canInstall: pct >= 50 };
  });
}

function doGet(e) {
  const act = e.parameter.action || 'leads';
  const pass = e.parameter.password;
  if (['leads','entrance_stats','get_cms'].includes(act) && pass !== ADMIN_PASS) {
    return response({error:'Неверный пароль'});
  }

  if (act === 'leads') return response({status:'success', data:getData(getSheet(SHEET_LEADS))});
  if (act === 'entrance_stats') return response({status:'success', stats:calcEntranceStats(getData(getSheet(SHEET_LEADS)))});
  if (act === 'get_cms') {
    const cms = {};
    getData(getSheet(SHEET_CMS)).forEach(r => cms[r.key] = r.value);
    return response(cms);
  }
  return response({error:'Unknown action'});
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  const pass = body.password || '';

  if (body.action === 'submit_lead') {
    const s = getSheet(SHEET_LEADS);
    s.appendRow([
      Utilities.getUuid(), new Date().toLocaleString('ru-RU'), body.name, body.phone,
      body.street, body.house, body.entrance, body.apartment,
      body.totalApartments, body.withSubscription, 'Новая', body.comment
    ]);
    return response({status:'success', message:'Заявка принята!'});
  }

  if (body.action === 'update_lead' && pass === ADMIN_PASS) {
    const s = getSheet(SHEET_LEADS);
    const rows = s.getDataRange().getValues();
    for (let i=1; i<rows.length; i++) {
      if (rows[i][0] === body.id) {
        if (body.status) s.getRange(i+1, 11).setValue(body.status);
        if (body.comment !== undefined) s.getRange(i+1, 12).setValue(body.comment);
        return response({status:'updated'});
      }
    }
    return response({error:'Не найдено'});
  }

  if (body.action === 'update_cms' && pass === ADMIN_PASS) {
    const s = getSheet(SHEET_CMS);    const rows = s.getDataRange().getValues();
    for (let i=1; i<rows.length; i++) {
      if (rows[i][0] === body.key) {
        s.getRange(i+1, 3).setValue(body.value);
        s.getRange(i+1, 5).setValue(new Date());
        return response({status:'updated'});
      }
    }
    s.appendRow([body.key, body.section||'general', body.value, 'text', new Date()]);
    return response({status:'created'});
  }

  return response({error:'Unknown action'});
}

function response(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}