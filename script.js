"use strict";

/* ===== HELPERS ===== */
const $ = (id) => document.getElementById(id);
const fmt = (n, max = 6) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: max });
const STORAGE_KEY = "troToolboxHistoryV1";
const colorData = [
  {name:"Hitam", hex:"#111827", digit:0, multiplier:1, tolerance:null},
  {name:"Cokelat", hex:"#8b5e3c", digit:1, multiplier:10, tolerance:1},
  {name:"Merah", hex:"#ef4444", digit:2, multiplier:100, tolerance:2},
  {name:"Oranye", hex:"#f97316", digit:3, multiplier:1000, tolerance:null},
  {name:"Kuning", hex:"#facc15", digit:4, multiplier:10000, tolerance:null},
  {name:"Hijau", hex:"#22c55e", digit:5, multiplier:100000, tolerance:0.5},
  {name:"Biru", hex:"#3b82f6", digit:6, multiplier:1000000, tolerance:0.25},
  {name:"Ungu", hex:"#8b5cf6", digit:7, multiplier:10000000, tolerance:0.1},
  {name:"Abu-abu", hex:"#9ca3af", digit:8, multiplier:100000000, tolerance:0.05},
  {name:"Putih", hex:"#f9fafb", digit:9, multiplier:1000000000, tolerance:null},
  {name:"Emas", hex:"#d4af37", digit:null, multiplier:0.1, tolerance:5},
  {name:"Perak", hex:"#c0c0c0", digit:null, multiplier:0.01, tolerance:10}
];
const toleranceOptions = colorData.filter(c => c.tolerance !== null);
const multiplierOptions = colorData.filter(c => c.multiplier !== null);

function showMessage(id, message) {
  const box = $(id);
  box.replaceChildren();
  const span = document.createElement("span");
  span.className = "result-placeholder";
  span.textContent = message;
  box.appendChild(span);
}
function showResult(id, title, formula, value, unit = "") {
  const box = $(id);
  box.replaceChildren();
  for (const [cls, txt] of [
    ["result-label", title],
    ["result-formula", formula],
    ["result-value", `${fmt(value)}${unit ? " " + unit : ""}`]
  ]) {
    const el = document.createElement("span");
    el.className = cls;
    el.textContent = txt;
    box.appendChild(el);
  }
}
function readNumber(id) {
  const raw = $(id).value.trim();
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
function niceOhm(n) {
  if (Math.abs(n) >= 1e6) return `${fmt(n / 1e6)} MΩ`;
  if (Math.abs(n) >= 1e3) return `${fmt(n / 1e3)} kΩ`;
  return `${fmt(n)} Ω`;
}

/* ===== HISTORY: BROWSER LOCAL STORAGE ===== */
function getHistory() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function saveHistory(type, detail, result) {
  const items = getHistory();
  items.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type, detail, result,
    time: new Date().toISOString()
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 100)));
  } catch {
    // Calculations still work if browser storage is unavailable.
  }
  renderHistory();
}
function renderHistory() {
  const items = getHistory();
  $("jumlahRiwayat").textContent = `${items.length} perhitungan`;
  const list = $("daftarRiwayat");
  list.replaceChildren();
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "result-placeholder";
    p.textContent = "Belum ada perhitungan. Coba salah satu kalkulator di atas.";
    list.appendChild(p);
    return;
  }
  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "history-item";
    const top = document.createElement("div");
    top.className = "history-item-top";
    const heading = document.createElement("h3");
    heading.textContent = item.type;
    const time = document.createElement("time");
    const date = new Date(item.time);
    time.textContent = Number.isNaN(date.getTime()) ? "" : date.toLocaleString("id-ID");
    top.append(heading, time);
    const detail = document.createElement("p");
    detail.textContent = item.detail;
    const result = document.createElement("p");
    result.textContent = `Hasil: ${item.result}`;
    const del = document.createElement("button");
    del.className = "history-delete";
    del.type = "button";
    del.textContent = "Hapus catatan ini";
    del.addEventListener("click", () => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(getHistory().filter(x => x.id !== item.id))); } catch {}
      renderHistory();
    });
    card.append(top, detail, result, del);
    list.appendChild(card);
  });
}
$("hapusRiwayat").addEventListener("click", () => {
  if (!confirm("Hapus semua riwayat perhitungan di browser ini?")) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  renderHistory();
});

/* ===== MENU NAVIGATION ===== */
document.querySelectorAll(".tool-list button[data-target]").forEach(button => {
  button.addEventListener("click", () => $(button.dataset.target)?.scrollIntoView({behavior:"smooth", block:"start"}));
});
$("kembaliKeAtas").addEventListener("click", () => window.scrollTo({top:0, behavior:"smooth"}));

/* ===== OHM LAW =====
   Input yang dipakai harus dua besaran selain besaran yang dipilih sebagai target.
*/
$("hitungOhm").addEventListener("click", () => {
  const target = $("operasiOhm").value;
  const ids = {tegangan:"nilaiV", arus:"nilaiI", hambatan:"nilaiR"};
  const values = {tegangan:readNumber("nilaiV"), arus:readNumber("nilaiI"), hambatan:readNumber("nilaiR")};
  if (Object.values(values).some(v => v !== null && v < 0)) {
    showMessage("hasilOhm", "Nilai tegangan, arus, dan hambatan tidak boleh negatif.");
    return;
  }
  let result, formula, unit, detail;
  if (target === "arus") {
    if (values.tegangan === null || values.hambatan === null || values.hambatan === 0) {
      showMessage("hasilOhm", "Untuk mencari arus, isi tegangan dan hambatan positif.");
      return;
    }
    result = values.tegangan / values.hambatan; formula = "I = V / R"; unit = "A";
    detail = `V = ${values.tegangan} V; R = ${values.hambatan} Ω`;
  } else if (target === "tegangan") {
    if (values.arus === null || values.hambatan === null) {
      showMessage("hasilOhm", "Untuk mencari tegangan, isi arus dan hambatan.");
      return;
    }
    result = values.arus * values.hambatan; formula = "V = I × R"; unit = "V";
    detail = `I = ${values.arus} A; R = ${values.hambatan} Ω`;
  } else if (target === "hambatan") {
    if (values.tegangan === null || values.arus === null || values.arus === 0) {
      showMessage("hasilOhm", "Untuk mencari hambatan, isi tegangan dan arus positif.");
      return;
    }
    result = values.tegangan / values.arus; formula = "R = V / I"; unit = "Ω";
    detail = `V = ${values.tegangan} V; I = ${values.arus} A`;
  } else {
    const V = values.tegangan, I = values.arus, R = values.hambatan;
    if (V !== null && I !== null) { result = V * I; formula = "P = V × I"; detail = `V = ${V} V; I = ${I} A`; }
    else if (I !== null && R !== null) { result = I * I * R; formula = "P = I² × R"; detail = `I = ${I} A; R = ${R} Ω`; }
    else if (V !== null && R !== null && R !== 0) { result = V * V / R; formula = "P = V² / R"; detail = `V = ${V} V; R = ${R} Ω`; }
    else { showMessage("hasilOhm", "Untuk mencari daya, isi dua besaran yang sesuai: V dan I, I dan R, atau V dan R."); return; }
    unit = "W";
  }
  if (!Number.isFinite(result)) { showMessage("hasilOhm", "Hasil tidak dapat dihitung. Periksa kembali input."); return; }
  showResult("hasilOhm", "Rumus yang digunakan", formula, result, unit);
  saveHistory("Hukum Ohm", detail, `${fmt(result)} ${unit}`);
});

/* ===== SERIES / PARALLEL RESISTORS ===== */
function updateResistorFields() {
  const count = Number($("jumlahResistor").value);
  for (let i = 3; i <= 5; i++) $(`fieldR${i}`).hidden = i > count;
}
$("jumlahResistor").addEventListener("change", updateResistorFields);
updateResistorFields();
$("hitungResistor").addEventListener("click", () => {
  const count = Number($("jumlahResistor").value);
  const type = $("jenisResistor").value;
  const values = [];
  for (let i = 1; i <= count; i++) {
    const n = readNumber(`r${i}`);
    if (n === null || n <= 0) { showMessage("hasilResistor", `Masukkan nilai R${i} yang lebih besar dari nol.`); return; }
    values.push(n);
  }
  const result = type === "seri"
    ? values.reduce((sum, n) => sum + n, 0)
    : 1 / values.reduce((sum, n) => sum + 1 / n, 0);
  const formula = type === "seri"
    ? "Rtotal = " + values.map(n => fmt(n)).join(" + ")
    : "1/Rtotal = " + values.map(n => `1/${fmt(n)}`).join(" + ");
  showResult("hasilResistor", `Rangkaian ${type}`, formula, result, "Ω");
  saveHistory("Resistor seri-paralel", values.map((n,i) => `R${i+1}=${n} Ω`).join("; ") + `; rangkaian ${type}`, niceOhm(result));
});

/* ===== ERROR CALCULATOR ===== */
$("hitungError").addEventListener("click", () => {
  const reference = readNumber("nilaiAcuan"), measured = readNumber("nilaiUkur");
  if (reference === null || measured === null) { showMessage("hasilError", "Masukkan nilai acuan dan pengukuran."); return; }
  if (reference === 0) { showMessage("hasilError", "Nilai acuan tidak boleh nol untuk menghitung persentase error."); return; }
  const absolute = Math.abs(measured - reference);
  const percent = absolute / Math.abs(reference) * 100;
  showResult("hasilError", "Error absolut", `|${fmt(measured)} − ${fmt(reference)}|`, absolute, "");
  const p = document.createElement("p");
  p.className = "result-formula";
  p.textContent = `Persentase error = ${fmt(percent)}%`;
  $("hasilError").appendChild(p);
  saveHistory("Error calculator", `Acuan=${reference}; pengukuran=${measured}`, `error absolut ${fmt(absolute)}; ${fmt(percent)}%`);
});

/* ===== UNIT CONVERTER ===== */
const units = {
  tegangan: {V:1, mV:1e-3, "kV":1e3},
  arus: {A:1, mA:1e-3, "µA":1e-6},
  hambatan: {"Ω":1, "kΩ":1e3, "MΩ":1e6},
  daya: {W:1, mW:1e-3, kW:1e3},
  kapasitansi: {F:1, "µF":1e-6, nF:1e-9, pF:1e-12},
  frekuensi: {Hz:1, kHz:1e3, MHz:1e6, GHz:1e9}
};
function updateUnitOptions() {
  const choices = Object.keys(units[$("jenisKonversi").value]);
  for (const id of ["satuanDari", "satuanKe"]) {
    const select = $(id); select.replaceChildren();
    choices.forEach((unit, i) => {
      const option = document.createElement("option");
      option.value = unit; option.textContent = unit; select.appendChild(option);
    });
  }
  if (choices.length > 1) $("satuanKe").selectedIndex = 1;
}
$("jenisKonversi").addEventListener("change", updateUnitOptions);
$("hitungKonversi").addEventListener("click", () => {
  const value = readNumber("nilaiKonversi"), category = $("jenisKonversi").value;
  const from = $("satuanDari").value, to = $("satuanKe").value;
  if (value === null) { showMessage("hasilKonversi", "Masukkan nilai yang ingin dikonversi."); return; }
  const result = value * units[category][from] / units[category][to];
  showResult("hasilKonversi", "Hasil konversi", `${fmt(value)} ${from} =`, result, to);
  saveHistory("Konversi satuan", `${fmt(value)} ${from} ke ${to}`, `${fmt(result)} ${to}`);
});
updateUnitOptions();

/* ===== RESISTOR COLOR DECODER ===== */
function makeOptions(select, items, getValue, getLabel) {
  select.replaceChildren();
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    select.appendChild(option);
  });
}
function fillColorSelectors() {
  const bandCount = Number($("jumlahGelang").value);
  const digitColors = colorData.filter(c => c.digit !== null);
  makeOptions($("gelang1"), digitColors, c => c.name, c => `${c.name} (${c.digit})`);
  makeOptions($("gelang2"), digitColors, c => c.name, c => `${c.name} (${c.digit})`);
  makeOptions($("gelang3"), digitColors, c => c.name, c => `${c.name} (${c.digit})`);
  if (bandCount === 4) {
    makeOptions($("gelang4"), toleranceOptions, c => c.name, c => `${c.name} (±${c.tolerance}%)`);
    makeOptions($("gelang5"), toleranceOptions, c => c.name, c => `${c.name} (±${c.tolerance}%)`);
  } else {
    makeOptions($("gelang4"), colorData, c => c.name, c => `${c.name} (×${fmt(c.multiplier)})`);
    makeOptions($("gelang5"), toleranceOptions, c => c.name, c => `${c.name} (±${c.tolerance}%)`);
  }
  $("fieldGelang3").hidden = bandCount === 4;
  $("labelGelang4").textContent = bandCount === 4 ? "Gelang 3 (pengali)" : "Gelang 4 (pengali)";
  $("labelGelang5").textContent = bandCount === 4 ? "Gelang 4 (toleransi)" : "Gelang 5 (toleransi)";
  // Defaults: brown-black-red-gold and brown-black-black-brown-brown
  $("gelang1").value = "Cokelat"; $("gelang2").value = "Hitam";
  $("gelang3").value = bandCount === 4 ? "Merah" : "Hitam";
  $("gelang4").value = bandCount === 4 ? "Emas" : "Cokelat";
  $("gelang5").value = "Cokelat";
  updateBandVisual();
}
function updateBandVisual() {
  const count = Number($("jumlahGelang").value);
  const chosen = count === 4
    ? [$("gelang1").value, $("gelang2").value, $("gelang3").value, $("gelang4").value]
    : [$("gelang1").value, $("gelang2").value, $("gelang3").value, $("gelang4").value, $("gelang5").value];
  for (let i = 1; i <= 5; i++) {
    const band = $(`visualBand${i}`);
    band.style.display = i <= count ? "block" : "none";
    const data = colorData.find(c => c.name === chosen[i-1]);
    band.style.backgroundColor = data ? data.hex : "transparent";
  }
}
$("jumlahGelang").addEventListener("change", fillColorSelectors);
["gelang1","gelang2","gelang3","gelang4","gelang5"].forEach(id => $(id).addEventListener("change", updateBandVisual));
$("hitungWarna").addEventListener("click", () => {
  const count = Number($("jumlahGelang").value);
  const c1 = colorData.find(c => c.name === $("gelang1").value);
  const c2 = colorData.find(c => c.name === $("gelang2").value);
  const c3 = count === 5 ? colorData.find(c => c.name === $("gelang3").value) : null;
  const multiplierColor = colorData.find(c => c.name === $("gelang4").value);
  const toleranceColor = colorData.find(c => c.name === $("gelang5").value);
  const digits = count === 4 ? c1.digit * 10 + c2.digit : c1.digit * 100 + c2.digit * 10 + c3.digit;
  const multiplier = count === 4
    ? colorData.find(c => c.name === $("gelang3").value).multiplier
    : multiplierColor.multiplier;
  const tolerance = count === 4 ? multiplierColor.tolerance : toleranceColor.tolerance;
  if (tolerance === null || !Number.isFinite(multiplier)) { showMessage("hasilWarna", "Kombinasi warna tidak valid. Periksa gelang pengali dan toleransi."); return; }
  const resistance = digits * multiplier;
  const min = resistance * (1 - tolerance / 100);
  const max = resistance * (1 + tolerance / 100);
  const bands = count === 4
    ? [$("gelang1").value, $("gelang2").value, $("gelang3").value, $("gelang4").value]
    : [$("gelang1").value, $("gelang2").value, $("gelang3").value, $("gelang4").value, $("gelang5").value];
  showResult("hasilWarna", `${count} gelang: ${bands.join(" – ")}`, `${fmt(digits)} × ${fmt(multiplier)}; toleransi ±${tolerance}%`, resistance, "Ω");
  const readable = document.createElement("p");
  readable.className = "result-formula";
  readable.textContent = `Nilai ringkas: ${niceOhm(resistance)}`;
  $("hasilWarna").appendChild(readable);
  const range = document.createElement("p");
  range.className = "result-formula";
  range.textContent = `Rentang nominal: ${niceOhm(min)} sampai ${niceOhm(max)}`;
  $("hasilWarna").appendChild(range);
  saveHistory("Resistor color code", bands.join(" – "), `${niceOhm(resistance)} ±${tolerance}%`);
});
function buildColorTable() {
  const tbody = $("tabelWarna");
  tbody.replaceChildren();
  colorData.forEach(c => {
    const tr = document.createElement("tr");
    const colorCell = document.createElement("td");
    const dot = document.createElement("span"); dot.className = "color-dot"; dot.style.backgroundColor = c.hex;
    const name = document.createElement("span"); name.textContent = c.name;
    colorCell.append(dot, name);
    const digit = document.createElement("td"); digit.textContent = c.digit === null ? "—" : c.digit;
    const mult = document.createElement("td"); mult.textContent = c.multiplier === null ? "—" : `×${fmt(c.multiplier)}`;
    const tol = document.createElement("td"); tol.textContent = c.tolerance === null ? "—" : `±${c.tolerance}%`;
    tr.append(colorCell, digit, mult, tol); tbody.appendChild(tr);
  });
}
fillColorSelectors();
buildColorTable();

/* ===== FORMULA LIBRARY ===== */
const formulas = [
  {title:"Hukum Ohm", eq:"V = I × R", desc:"Tegangan sama dengan arus dikalikan hambatan. Bentuk lain: I = V/R dan R = V/I.", tag:"Dasar listrik"},
  {title:"Daya listrik DC", eq:"P = V × I", desc:"Daya listrik adalah laju pemindahan energi. Untuk resistor: P = I²R atau P = V²/R.", tag:"Daya"},
  {title:"Energi listrik", eq:"E = P × t", desc:"Energi adalah daya dikalikan waktu. Jika P dalam watt dan t dalam sekon, E dalam joule.", tag:"Energi"},
  {title:"Hukum Kirchhoff Arus (KCL)", eq:"Σ I masuk = Σ I keluar", desc:"Jumlah arus yang masuk ke simpul sama dengan jumlah arus yang keluar, berdasarkan kekekalan muatan.", tag:"Analisis rangkaian"},
  {title:"Hukum Kirchhoff Tegangan (KVL)", eq:"Σ V = 0", desc:"Jumlah aljabar tegangan di sepanjang loop tertutup sama dengan nol, berdasarkan kekekalan energi.", tag:"Analisis rangkaian"},
  {title:"Resistor seri", eq:"Rₜ = R₁ + R₂ + …", desc:"Pada rangkaian seri, arus sama melalui semua resistor dan hambatan total dijumlahkan.", tag:"Resistor"},
  {title:"Resistor paralel", eq:"1/Rₜ = 1/R₁ + 1/R₂ + …", desc:"Untuk resistor paralel, jumlah kebalikan hambatan menentukan kebalikan hambatan total.", tag:"Resistor"},
  {title:"Hukum Coulomb", eq:"F = k |q₁q₂| / r²", desc:"Besar gaya elektrostatik dua muatan titik sebanding dengan hasil kali muatan dan berbanding terbalik dengan kuadrat jarak.", tag:"Elektrostatika"},
  {title:"Kapasitansi", eq:"C = Q / V", desc:"Kapasitansi adalah perbandingan muatan yang tersimpan terhadap beda potensial pada kapasitor.", tag:"Kapasitor"},
  {title:"Energi kapasitor", eq:"E = ½ C V²", desc:"Energi yang tersimpan dalam kapasitor ideal dapat dihitung dari kapasitansi dan tegangan.", tag:"Kapasitor"},
  {title:"Reaktansi kapasitor", eq:"Xc = 1 / (2πfC)", desc:"Hambatan semu kapasitor terhadap arus AC. Semakin tinggi frekuensi atau kapasitansi, semakin kecil Xc.", tag:"AC"},
  {title:"Reaktansi induktor", eq:"XL = 2πfL", desc:"Hambatan semu induktor terhadap arus AC. Reaktansi induktif meningkat seiring frekuensi.", tag:"AC"},
  {title:"Hukum Faraday", eq:"ε = −N · dΦ/dt", desc:"GGL induksi bergantung pada laju perubahan fluks magnetik yang menembus kumparan.", tag:"Elektromagnetisme"},
  {title:"Frekuensi dan periode", eq:"f = 1 / T", desc:"Frekuensi adalah jumlah siklus per sekon; periode adalah waktu untuk satu siklus.", tag:"Sinyal"},
  {title:"Hukum pembagi tegangan", eq:"Vout = Vin · R₂/(R₁+R₂)", desc:"Untuk dua resistor seri, tegangan pada R₂ dapat dihitung jika output diambil melintasi R₂ dan beban tidak memengaruhi pembagi.", tag:"Rangkaian"},
  {title:"Konstanta waktu RC", eq:"τ = R × C", desc:"Konstanta waktu menunjukkan skala waktu respons pengisian atau pengosongan kapasitor pada rangkaian RC sederhana.", tag:"Rangkaian RC"}
];
function renderFormulas(filter = "") {
  const container = $("daftarRumus");
  container.replaceChildren();
  const q = filter.toLowerCase().trim();
  const filtered = formulas.filter(f => `${f.title} ${f.eq} ${f.desc} ${f.tag}`.toLowerCase().includes(q));
  if (!filtered.length) {
    const p = document.createElement("p"); p.className = "empty-state"; p.textContent = "Tidak ada rumus yang cocok dengan pencarian."; container.appendChild(p); return;
  }
  filtered.forEach(f => {
    const card = document.createElement("article"); card.className = "formula-card";
    const title = document.createElement("h3"); title.textContent = f.title;
    const equation = document.createElement("div"); equation.className = "formula-equation"; equation.textContent = f.eq;
    const desc = document.createElement("p"); desc.textContent = f.desc;
    const tag = document.createElement("span"); tag.className = "formula-tag"; tag.textContent = f.tag;
    card.append(title, equation, desc, tag); container.appendChild(card);
  });
}
$("cariRumus").addEventListener("input", e => renderFormulas(e.target.value));
renderFormulas();

/* ===== SHORT HISTORY OF ELECTRICITY LAWS ===== */
const historyData = [
  {year:"1785", title:"Hukum Coulomb — Charles-Augustin de Coulomb", text:"Melalui eksperimen dengan neraca puntir, Coulomb mengukur gaya antara muatan listrik. Hasilnya membantu merumuskan hubungan gaya elektrostatik terhadap besar muatan dan jarak."},
  {year:"1820", title:"Hubungan arus listrik dan magnet — Hans Christian Ørsted", text:"Ørsted mengamati jarum kompas menyimpang ketika berada dekat kawat yang dialiri arus. Pengamatan ini menjadi petunjuk penting bahwa arus listrik menghasilkan efek magnetik."},
  {year:"1827", title:"Hukum Ohm — Georg Simon Ohm", text:"Ohm mempelajari hubungan tegangan, arus, dan hambatan pada penghantar. Karyanya Die galvanische Kette, mathematisch bearbeitet (1827) menyusun hubungan yang kini dikenal sebagai Hukum Ohm."},
  {year:"1831", title:"Induksi elektromagnetik — Michael Faraday", text:"Faraday menemukan bahwa perubahan medan magnet dapat menimbulkan arus atau GGL induksi. Eksperimen ini menjadi dasar kerja generator dan transformator."},
  {year:"1840", title:"Pemanasan Joule — James Prescott Joule", text:"Eksperimen Joule menunjukkan hubungan antara arus listrik dan panas yang dihasilkan pada penghantar. Hukum pemanasan Joule umum ditulis P = I²R."},
  {year:"1845", title:"Hukum Kirchhoff — Gustav Kirchhoff", text:"Kirchhoff merumuskan aturan simpul dan loop untuk analisis rangkaian, yang mengungkap kekekalan muatan dan energi dalam jaringan listrik."},
  {year:"1864", title:"Persamaan elektromagnetisme — James Clerk Maxwell", text:"Maxwell menyatukan gagasan listrik dan magnet dalam teori elektromagnetik. Persamaannya kemudian membantu menjelaskan gelombang elektromagnetik dan cahaya."}
];
function renderTimeline() {
  const container = $("daftarSejarah");
  historyData.forEach(item => {
    const article = document.createElement("article"); article.className = "timeline-item";
    const year = document.createElement("span"); year.className = "timeline-year"; year.textContent = item.year;
    const title = document.createElement("h3"); title.textContent = item.title;
    const text = document.createElement("p"); text.textContent = item.text;
    article.append(year, title, text); container.appendChild(article);
  });
}
renderTimeline();
renderHistory();
