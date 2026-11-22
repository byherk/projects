/* ===== Nội dung (sửa hoặc thêm mục ở đây; giao diện tự hiển thị) ===== */

/* Giải thích thuật ngữ khi rê chuột hoặc chạm. Tên tiếng Việt khớp danh sách ở comment đầu file. */
const GLOSS = {
  "Target": "Mục tiêu: làm việc này để đạt điều gì, ai dùng kết quả.",
  "Artifact": "Sản phẩm: thứ bạn nhận về, ví dụ file, bảng, email, câu trả lời, trang web.",
  "Standard": "Đạt khi: tiêu chí và cách kiểm để biết kết quả đã đúng.",
  "Key limits": "Giới hạn: những việc AI không được làm, và ranh giới về phạm vi, quyền, ngân sách, rủi ro.",
  "Interval": "Thời hạn: hạn chót, độ dài, số lần được sửa.",
  "Names": "Vai trò: ai làm chính, ai kiểm, ai duyệt.",
  "Game plan": "Cách làm: các bước, và làm gì khi bị vướng.",
  "Instructions": "Phần hướng dẫn chung bạn cài cho AI một lần, để mọi cuộc trò chuyện sau đều theo cách này."
};

/* Bảy chữ. Thẻ 5W-2H của từng chữ (WHY, WHAT, HOW GOOD, WHERE, WHEN, WHO, HOW) chỉ ghi ở đây và trong bản Instructions. */
const LETTERS = [
  { L: "T", vi: "Mục tiêu", en: "Target", q: "Làm để đạt điều gì, ai dùng kết quả? Chữ quan trọng nhất." },          // WHY
  { L: "A", vi: "Sản phẩm", en: "Artifact", q: "Cần nhận về cái gì, ở dạng nào, gửi ở đâu?" },                      // WHAT
  { L: "S", vi: "Đạt khi", en: "Standard", q: "Thế nào là đạt, kiểm bằng cách nào?" },                             // HOW GOOD
  { L: "K", vi: "Giới hạn", en: "Key limits", q: "Không được làm gì? Phạm vi, quyền, ngân sách, rủi ro." },         // WHERE
  { L: "I", vi: "Thời hạn", en: "Interval", q: "Hạn chót, độ dài, được sửa mấy lần (mặc định 2)?" },               // WHEN
  { L: "N", vi: "Vai trò", en: "Names", q: "Ai làm chính, ai kiểm, ai duyệt?" },                                   // WHO
  { L: "G", vi: "Cách làm", en: "Game plan", q: "Làm theo những bước nào, bị vướng thì làm gì?" }                  // HOW
];

/* ----- Ô Thử ngay: các loại việc ----- */
const TYPES = [
  { id: "meeting", label: "Biên bản → việc cần làm", kw: /biên bản|cuộc họp|\bhọp\b|meeting|minutes/i,
    target: "Cả nhóm biết ai làm việc gì, hạn khi nào",
    art: "Bảng: Việc cần làm | Người phụ trách | Hạn chót | Ghi chú, kèm 3 dòng tóm tắt quyết định chính",
    std: ["Chỉ lấy việc có trong nội dung gốc; việc thiếu người phụ trách hoặc hạn thì ghi \"Chưa rõ\", không tự đoán."],
    lim: "Không thêm việc ngoài nội dung gốc, không đổi tên người",
    mat: "[Dán nội dung biên bản họp]" },
  { id: "email", label: "Viết email", kw: /e-?mail|(^|\s)thư(\s|$|[,.])|\bmail\b/i,
    target: "[Người nhận] làm được [việc gì] / nắm được [thông tin gì]",
    art: "1 email có tiêu đề, ngắn gọn, giọng phù hợp với người nhận",
    std: ["Điều cần người nhận làm và hạn (nếu có) nằm ngay đoạn đầu."],
    lim: "Không hứa điều tôi chưa nói, không bịa số liệu hay ngày tháng",
    mat: "[Dán email trước hoặc thông tin liên quan]" },
  { id: "excel", label: "Công thức Excel / bảng tính", kw: /excel|công thức|\bhàm\b|vlookup|xlookup|pivot|bảng tính|google sheets?/i,
    target: "Tính/tìm được [điều gì] trong bảng tính của tôi",
    art: "Công thức dùng được ngay, giải thích ngắn từng phần, kèm 1 ví dụ",
    std: ["Khớp cấu trúc dữ liệu tôi mô tả; nêu trường hợp công thức có thể lỗi và cách tránh."],
    lim: "Không dùng macro/VBA nếu tôi không yêu cầu",
    mat: "[Mô tả các cột dữ liệu, phiên bản Excel/Sheets, công thức đang lỗi nếu có]" },
  { id: "build", label: "Làm sản phẩm / code", kw: /html|website|\bweb\b|\bapp\b|\bcode\b|dashboard|script|phần mềm|ứng dụng|trang web/i,
    target: "[Ai] dùng sản phẩm này để [làm gì]",
    art: "Sản phẩm hoàn chỉnh chạy được, không gửi từng đoạn rời",
    std: ["Tự chạy thử trước khi gửi; ghi rõ phần nào đã kiểm, phần nào chưa.", "Nếu sửa sản phẩm có sẵn: giữ nguyên chức năng cũ đang hoạt động."],
    lim: "Không thêm tính năng ngoài yêu cầu; có đề xuất thì ghi ở cuối",
    mat: "[Đính kèm file hoặc mô tả hiện trạng]" },
  { id: "summary", label: "Tóm tắt tài liệu / báo cáo", kw: /tóm tắt|tổng hợp|báo cáo|tài liệu|summar|report/i,
    target: "[Tôi / sếp] nắm nội dung chính trong 2 phút để [quyết định gì]",
    art: "Tóm tắt dạng gạch đầu dòng: kết luận chính, số liệu quan trọng, rủi ro, việc cần làm",
    std: ["Mỗi số liệu ghi rõ lấy ở đâu trong tài liệu; tách điều tài liệu nói khỏi nhận xét của AI."],
    lim: "Không thêm thông tin ngoài tài liệu; chỗ không rõ ghi \"tài liệu không nêu\"",
    mat: "[Dán nội dung hoặc đính kèm tài liệu]" },
  { id: "other", label: "Việc khác", kw: null,
    target: "[Kết quả này dùng để làm gì, cho ai]",
    art: "[Định dạng, độ dài của kết quả bạn muốn nhận]",
    std: ["[Thế nào là đạt yêu cầu]"],
    lim: "Không bịa thông tin; chỗ đơn giản hóa hoặc chưa chắc thì nói rõ",
    mat: "[Dán thông tin liên quan, nếu có]" }
];
const DETECT_ORDER = ["meeting", "email", "excel", "build", "summary"];

const EXAMPLES = [
  { raw: "Tổng hợp biên bản họp hôm nay thành danh sách công việc, người phụ trách và deadline", target: "", art: "", lim: "", int: "Gửi trong hôm nay" },
  { raw: "Viết email nhắc khách hàng thanh toán hóa đơn tháng 10 đã quá hạn 5 ngày", target: "Khách thanh toán trong tuần này mà vẫn giữ quan hệ tốt", art: "", lim: "", int: "Dưới 120 chữ" },
  { raw: "Viết công thức Excel tính tổng doanh thu theo từng nhân viên trong tháng", target: "", art: "", lim: "", int: "" },
  { raw: "Tóm tắt báo cáo tài chính quý 3 cho sếp", target: "Sếp quyết định có cắt giảm chi phí marketing không", art: "", lim: "", int: "Tối đa 1 trang" }
];

/* ----- Mẫu prompt -----
   Ghi chú cho người biên soạn mẫu (không hiện trên giao diện):
   - Mẫu dùng được riêng lẻ. Khi người dùng đã cài Instructions, mục không ghi trong prompt thì AI xử lý theo ASSUME-OR-ASK.
   - Chỉ thêm dòng [Tùy chọn] "gửi bố cục để chốt trước" khi còn lựa chọn quan trọng ảnh hưởng Target, Standard hoặc cấu trúc khó hoàn tác.
   - Mục tiêu khác bằng chứng: kết quả mong muốn ghi ở Mục tiêu; tiêu chí và cách kiểm ghi ở Đạt khi.
   - RISK-REVIEW và SHIP-NEXT áp dụng cho mọi mẫu; duyệt phương án không có nghĩa sản phẩm đã PASS.
   - Nhãn trong mẫu viết thẳng theo dạng "Tên tiếng Việt (Thuật ngữ):". */
const OFFICE = [
  { short: "Biên bản → việc", title: "Biên bản họp → danh sách việc", use: "Sau cuộc họp, cần biết ai làm gì, hạn khi nào.",
    body: `Mục tiêu (Target): Biến biên bản họp [tên cuộc họp, ngày] thành danh sách việc để cả nhóm biết ai làm gì, hạn khi nào.

Sản phẩm (Artifact): Bảng gồm Việc cần làm | Người phụ trách | Hạn chót | Ghi chú.
Kèm 3 dòng tóm tắt các quyết định chính.

Đạt khi (Standard):
- Chỉ lấy việc có trong biên bản; mỗi việc dẫn được câu gốc làm căn cứ.
- Việc chưa có người phụ trách hoặc hạn thì ghi "Chưa rõ", không tự đoán.

Giới hạn (Key limits): Không thêm việc ngoài biên bản. Không đổi tên người.

Biên bản: [dán nội dung]` },
  { short: "Viết email", title: "Viết email", use: "Xin duyệt, báo tin, nhắc việc, phản hồi khách hàng.",
    body: `Mục tiêu (Target): Gửi email cho [người nhận, quan hệ với tôi] để [kết quả mong muốn: xin duyệt / báo tin / nhắc việc].

Sản phẩm (Artifact): 1 email có tiêu đề, dài khoảng [số câu], giọng [trang trọng / thân thiện].

Đạt khi (Standard):
- Điều cần người nhận làm và hạn (nếu có) nằm ngay đoạn đầu.
- Có đủ các ý: [ý 1], [ý 2].

Giới hạn (Key limits): Không hứa điều tôi chưa nói. Không bịa số liệu, ngày tháng.

Bối cảnh: [dán email trước hoặc thông tin liên quan]` },
  { short: "Công thức Excel", title: "Công thức Excel / bảng tính", use: "Viết công thức mới hoặc sửa công thức đang lỗi.",
    body: `Mục tiêu (Target): Tôi cần [tính / tìm / đếm] [điều gì] trong [Excel / Google Sheets, phiên bản nếu biết].

Sản phẩm (Artifact): Công thức dùng được ngay + giải thích ngắn từng phần + 1 ví dụ.

Đạt khi (Standard):
- Khớp cấu trúc dữ liệu của tôi: [cột A là…, cột B là…, dữ liệu từ dòng 2 đến dòng …].
- Nêu trường hợp công thức có thể lỗi (ô trống, sai kiểu dữ liệu) và cách tránh.

Giới hạn (Key limits): Không dùng macro/VBA. Ưu tiên hàm có sẵn trong phiên bản của tôi.

Lỗi đang gặp (nếu có): [dán công thức và thông báo lỗi]` },
  { short: "Tóm tắt báo cáo", title: "Tóm tắt tài liệu / báo cáo", use: "Đọc nhanh tài liệu dài, chuẩn bị báo cáo sếp.",
    body: `Mục tiêu (Target): Giúp [tôi / sếp / khách hàng] nắm nội dung chính của [tài liệu] trong [2 phút] để [quyết định gì].

Sản phẩm (Artifact): Tóm tắt [5 gạch đầu dòng / 1 trang], gồm: kết luận chính, số liệu quan trọng, rủi ro, việc cần làm.

Đạt khi (Standard):
- Mỗi số liệu ghi rõ lấy ở trang/mục nào trong tài liệu.
- Tách rõ điều tài liệu nói với nhận xét của bạn.

Giới hạn (Key limits): Không thêm thông tin ngoài tài liệu. Chỗ không rõ thì ghi "tài liệu không nêu".

Tài liệu: [dán nội dung hoặc đính kèm file]` }
];

const BUILDER = [
  { short: "Câu hỏi nhanh", title: "Câu hỏi nhanh / giải thích", use: "Khi cần AI giải thích hoặc giúp quyết định một vấn đề.",
    body: `Mục tiêu (Target): Giúp tôi [hiểu / quyết định] [chủ đề]. Tôi là [trình độ, bối cảnh].

Sản phẩm (Artifact): [Câu trả lời / sơ đồ / ví dụ] gồm [các ý cần có].

Đạt khi (Standard):
- Có đủ [các ý cần có], giải thích theo trình tự [A → B → C].
- Thông tin dễ thay đổi có tra cứu và ghi nguồn.
- Chỗ nào đơn giản hóa thì nói rõ.

Giới hạn (Key limits): Không [dùng thuật ngữ nặng / lan man / bịa số liệu].` },
  { short: "Sản phẩm mới", title: "Tạo sản phẩm mới", use: "File, trang HTML, dashboard, tài liệu… làm từ đầu.",
    body: `Mục tiêu (Target): [Ai] cần [làm được / quyết định được điều gì] nhờ sản phẩm này.

Sản phẩm (Artifact): [Loại, định dạng], gồm:
1. [Thành phần chính 1]
2. [Thành phần chính 2]
Nguồn dữ liệu: [file đính kèm / tự tạo dữ liệu mẫu].

Đạt khi (Standard):
- [Tiêu chí kiểm được, ví dụ: tổng số liệu khớp file gốc; mỗi biểu đồ có tiêu đề nêu kết luận].
- Tự chạy/kiểm thử; ghi rõ phần nào đã kiểm, phần nào chưa.

Giới hạn (Key limits): Không [sửa file gốc / bịa số / thêm tính năng ngoài yêu cầu]. [Dữ liệu mẫu, không dùng dữ liệu thật.]

Thời hạn (Interval): [hạn chót].
Vai trò (Names): Bạn làm và tự kiểm; [tôi / người khác] duyệt.
[Tùy chọn] Gửi bố cục để tôi chốt trước khi làm.` },
  { short: "Nâng cấp nội dung", title: "Thêm / nâng cấp nội dung cho sản phẩm có sẵn", use: "Thêm phần mới mà không biến sản phẩm thành bản chắp ghép.",
    body: `Mục tiêu (Target): Nâng cấp [tên sản phẩm] bằng [ý tưởng mới], để [người dùng hiểu/làm được gì thêm].
Kết quả là một sản phẩm liền mạch, không phải phần dán thêm.

Sản phẩm (Artifact): [Tên file] cập nhật, có thêm:
1. [Nội dung mới 1]
2. [Nội dung mới 2]

Đạt khi (Standard):
- Toàn bộ theo một mạch: [phần A] → [phần B] → [phần mới] → [phần C].
- Không lặp ý giữa phần cũ và mới; trùng thì gộp.
- Phong cách thống nhất; mỗi phần có câu nối với phần trước.
- Chức năng cũ vẫn hoạt động; ghi rõ phần nào đã kiểm.

Giới hạn (Key limits): Giữ nội dung và chức năng cũ đang đúng; chỉ sửa, gộp hoặc bỏ phần trùng khi cần để tích hợp.

[Tùy chọn] Gửi mục lục mới (đánh dấu thêm/gộp/sửa) để tôi chốt trước khi làm.` },
  { short: "Tài liệu học", title: "Tài liệu học / hướng dẫn kỹ năng", use: "Học nhanh một kỹ năng để đi làm, theo nguyên tắc 80/20.",
    body: `Mục tiêu (Target): Giúp [người học, trình độ] trong khoảng [số giờ] tự làm được [công việc cụ thể]
trong [bối cảnh], không cần học trọn khóa dài.

Sản phẩm (Artifact): [Định dạng] bằng [ngôn ngữ], gồm:
1. Lộ trình 80/20: dạy kỹ phần dùng nhiều; phần ít dùng giới thiệu ở mục "Học thêm khi cần".
2. Mỗi bài: mục đích, khi nào dùng, các bước, lỗi hay gặp, bài tập, prompt mẫu để nhờ AI.
3. Dữ liệu/tài liệu thực hành tự tạo.
4. Dự án cuối: [từ đầu vào thô đến sản phẩm hoàn chỉnh].

Đạt khi (Standard):
- Đủ các phần trên; mỗi bước đủ chi tiết để làm theo.
- Bám đặc thù công việc: [ví dụ định dạng ngày, tiền tệ, ngôn ngữ].
- Tên giao diện phần mềm giữ nguyên gốc, kèm giải thích.
- Thông tin phần mềm đối chiếu tài liệu chính thức hiện hành; ghi nguồn, thời điểm, chỗ chưa xác minh.
- File chạy được; ghi rõ phần nào đã kiểm.

Giới hạn (Key limits): Không dạy sâu phần nâng cao ít dùng. Không dùng dữ liệu thật; không lấy ảnh từ website bên ngoài.

[Tùy chọn] Gửi khung lộ trình (bài, mục tiêu, thời gian, lý do xếp nhóm) để tôi chốt trước khi làm.` },
  { short: "Sửa bố cục", title: "Chỉ sửa bố cục / giao diện", use: "Đổi giao diện, giữ nguyên nội dung.",
    body: `Mục tiêu (Target): Đổi [thành phần giao diện] để [lợi ích]. Nội dung đã duyệt, chỉ sửa bố cục.

Sản phẩm (Artifact): [Tên file] cập nhật:
1. [Thay đổi 1]
2. [Thay đổi 2]
3. [Bỏ thành phần cũ trùng chức năng, nếu có]

Đạt khi (Standard):
- [Chức năng mới hoạt động đúng].
- Thành phần bị ảnh hưởng (biểu đồ, canvas…) tự co giãn, vẫn tương tác bình thường.
- Chạy đúng trên [desktop/mobile]; giữ màu sắc, kiểu chữ, kiểu nút. Ghi rõ phần nào đã kiểm.

Giới hạn (Key limits):
- Không sửa nội dung, câu chữ, thứ tự hay logic nghiệp vụ; chỉ sửa phần cần để bố cục mới hoạt động.
- Không thêm tính năng ngoài yêu cầu; có đề xuất thì ghi ở cuối, không tự làm.` },
  { short: "Phản hồi AI", title: "Phản hồi đề xuất hoặc sản phẩm AI gửi", use: "Duyệt hoặc yêu cầu sửa. Duyệt phương án chưa có nghĩa là sản phẩm đã đạt.",
    body: `Phản hồi [phương án / sản phẩm]: [Duyệt / Cần sửa].

[Nếu có] Phải sửa:
1. [Vấn đề] — [vị trí] — [kết quả mong muốn]

[Nếu có] Góp ý nhỏ, không bắt buộc sửa:
1. [Góp ý ngắn]

[Nếu là sản phẩm hoàn chỉnh] Tôi xác nhận: [mục tiêu đã đạt / chưa đạt].` }
];

const GROUPS = [
  { name: "Văn phòng", items: OFFICE },
  { name: "Làm sản phẩm, code", items: BUILDER }
];

const AFTER_EXAMPLE = `Mục tiêu (Target): Giúp sếp nắm tình hình bán hàng quý này trong 2–3 phút
để quyết định sản phẩm nào cần đẩy mạnh.

Sản phẩm (Artifact): Dashboard từ file đính kèm: hàng KPI (doanh thu, số đơn,
% so với kỳ trước), doanh thu theo tháng, top sản phẩm, bộ lọc khu vực.

Đạt khi (Standard):
- Tổng doanh thu và số đơn khớp file gốc; ghi kết quả đối chiếu.
- Mỗi biểu đồ có tiêu đề nêu kết luận, kèm 3 nhận định ở đầu trang.
- Liệt kê lỗi dữ liệu tìm thấy và cách đã xử lý.

Giới hạn (Key limits): Không sửa file gốc. Không bịa số; thiếu thì ghi "thiếu dữ liệu".

Thời hạn (Interval): Tối đa 2 vòng sửa.
Vai trò (Names): Bạn làm và tự kiểm, tôi duyệt.
Cách làm (Game plan): Gửi bố cục để tôi chốt trước khi làm.`;

/* ===== Hiển thị ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const term = k => `<span class="term" data-term="${esc(k)}">${esc(k)}</span>`;

$("#stack").innerHTML = LETTERS.map(x => `
  <div class="lrow"><div class="L" aria-hidden="true">${x.L}</div>
  <div class="R"><div class="w"><strong>${esc(x.vi)}</strong><span class="en">${term(x.en)}</span></div><div class="q">${esc(x.q)}</div></div></div>`).join("");
$("#after-body").textContent = AFTER_EXAMPLE;

/* Giải thích thuật ngữ */
function applyGloss(root = document) {
  $$(".term", root).forEach(el => { const k = el.dataset.term; if (GLOSS[k]) { el.dataset.tip = GLOSS[k]; el.tabIndex = 0; } });
}
applyGloss();

/* ----- Ô Thử ngay ----- */
let typeId = "meeting", manualType = false, full = false, exIdx = 0;
const f = { raw: $("#b-raw"), target: $("#b-target"), art: $("#b-art"), lim: $("#b-lim"), int: $("#b-int") };
$("#types").innerHTML = TYPES.map(t => `<button type="button" class="type" data-id="${t.id}" aria-pressed="false">${esc(t.label)}</button>`).join("");
$$(".type").forEach(b => b.addEventListener("click", () => { typeId = b.dataset.id; manualType = true; render(); }));

function detect(text) {
  for (const id of DETECT_ORDER) { const t = TYPES.find(x => x.id === id); if (t.kw.test(text)) return id; }
  return "other";
}
const val = el => el.value.trim();

function buildPrompt() {
  const t = TYPES.find(x => x.id === typeId);
  const raw = val(f.raw) || "[Mô tả việc bạn cần AI làm]";
  const L = [];
  L.push(`Việc cần làm: ${raw}`, "");
  L.push(`Mục tiêu (Target): ${val(f.target) || t.target}`, "");
  L.push(`Sản phẩm (Artifact): ${val(f.art) || t.art}`, "");
  L.push("Đạt khi (Standard):");
  t.std.forEach(s => L.push(`- ${s}`));
  L.push("- Tự kiểm lại trước khi gửi; chỗ chưa chắc hoặc chưa kiểm thì ghi rõ.", "");
  L.push(`Giới hạn (Key limits): ${val(f.lim) || t.lim}.`, "");
  if (full) {
    L.push(`Thời hạn (Interval): ${val(f.int) || "[Hạn chót]"}. Tối đa 2 vòng sửa.`);
    L.push("Vai trò (Names): Bạn làm chính và tự kiểm. Tôi duyệt kết quả.");
    L.push("Cách làm (Game plan): Nếu còn lựa chọn quan trọng, gửi bố cục để tôi chốt trước. Bàn giao bản hoàn chỉnh, không gửi từng phần rời; cuối cùng báo 1 dòng: Trạng thái | Sản phẩm | Đạt/Chưa đạt/Chờ kiểm | Vướng mắc | Bước tiếp theo.", "");
  } else if (val(f.int)) {
    L.push(`Thời hạn (Interval): ${val(f.int)}.`, "");
  }
  L.push(`Nội dung: ${t.mat}`, "");
  L.push("Thiếu thông tin mà đoán sai dễ sửa thì tự chọn, ghi rõ giả định và làm luôn; chỉ hỏi lại khi đoán sai sẽ tốn kém.");
  return L.join("\n");
}

function render() {
  /* Chỉ tự gợi ý loại việc khi người dùng chưa tự chọn; tự chọn rồi thì giữ nguyên đến khi xóa hoặc đổi ví dụ. */
  if (!manualType && val(f.raw)) typeId = detect(val(f.raw));
  const t = TYPES.find(x => x.id === typeId);
  $$(".type").forEach(b => b.setAttribute("aria-pressed", b.dataset.id === typeId ? "true" : "false"));
  f.target.placeholder = t.target; f.art.placeholder = t.art; f.lim.placeholder = t.lim;
  f.int.placeholder = full ? "Ví dụ: trước 17h thứ Sáu" : "Không bắt buộc";
  $("#m-quick").setAttribute("aria-pressed", full ? "false" : "true");
  $("#m-full").setAttribute("aria-pressed", full ? "true" : "false");
  $("#b-out").textContent = buildPrompt();
}
function setExample(on) { $("#ex-flag").hidden = !on; }
function loadExample(i) {
  const e = EXAMPLES[i]; f.raw.value = e.raw; f.target.value = e.target; f.art.value = e.art; f.lim.value = e.lim; f.int.value = e.int;
  manualType = false; setExample(true); render();
}
Object.values(f).forEach(el => el.addEventListener("input", () => { setExample(false); render(); }));
$("#m-quick").addEventListener("click", () => { full = false; render(); });
$("#m-full").addEventListener("click", () => { full = true; render(); });
$("#b-example").addEventListener("click", () => { exIdx = (exIdx + 1) % EXAMPLES.length; loadExample(exIdx); });
$("#b-clear").addEventListener("click", () => { Object.values(f).forEach(el => el.value = ""); manualType = false; typeId = "other"; setExample(false); render(); f.raw.focus(); });
f.raw.placeholder = "Ví dụ: Tổng hợp biên bản họp hôm nay thành danh sách công việc, người phụ trách và deadline";
loadExample(0);

/* ----- Mẫu prompt: nhóm + tab ----- */
let gIdx = 0, tIdx = 0;
$("#groups").innerHTML = GROUPS.map(g => `<button type="button" class="group" aria-pressed="false">${esc(g.name)}</button>`).join("");
$$(".group").forEach((b, i) => b.addEventListener("click", () => { gIdx = i; tIdx = 0; drawTabs(); }));
function drawTabs() {
  $$(".group").forEach((b, i) => b.setAttribute("aria-pressed", i === gIdx ? "true" : "false"));
  const items = GROUPS[gIdx].items;
  $("#tabs").innerHTML = items.map(t => `<button class="tab" type="button" role="tab" aria-selected="false">${esc(t.short)}</button>`).join("");
  $$(".tab").forEach((b, i) => b.addEventListener("click", () => { tIdx = i; showTpl(); }));
  showTpl();
}
function currentTplText() { return GROUPS[gIdx].items[tIdx].body; }
function showTpl() {
  const t = GROUPS[gIdx].items[tIdx];
  $("#tpl-title").textContent = t.title;
  $("#tpl-use").textContent = t.use;
  $("#tpl-body").textContent = currentTplText();
  $$(".tab").forEach((b, k) => b.setAttribute("aria-selected", k === tIdx ? "true" : "false"));
}
drawTabs();

/* ----- Sao chép ----- */
const toast = $("#toast");
let tt;
function say(msg, ms = 2400) { toast.textContent = msg; toast.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove("show"), ms); }
function selectText(el) {
  const r = document.createRange(); r.selectNodeContents(el);
  const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
}
/* Khi trình duyệt chặn sao chép: bôi đen sẵn khung chữ tương ứng để người dùng tự sao chép. */
async function copyText(text, btn, sourceEl) {
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; }
  catch (e) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.left = "0"; ta.style.top = "0";
      document.body.appendChild(ta); ta.select(); ok = document.execCommand("copy"); ta.remove();
    } catch (e2) { ok = false; }
  }
  if (ok) {
    say("Đã sao chép. Dán vào AI bạn dùng.");
    if (btn) { const old = btn.dataset.label || btn.textContent; btn.dataset.label = old; btn.textContent = "Đã sao chép ✓"; btn.classList.add("ok"); setTimeout(() => { btn.textContent = old; btn.classList.remove("ok"); }, 2000); }
  } else if (sourceEl) {
    const d = sourceEl.closest("details"); if (d) d.open = true;
    selectText(sourceEl);
    say("Chưa sao chép được. Chữ đã được bôi đen sẵn, bạn sao chép bằng Ctrl+C (Cmd+C trên Mac) hoặc giữ tay trên điện thoại.", 5000);
  }
}
/* Bản Instructions nằm ở TASKING.md (cùng thư mục). Tải lỗi thì báo ở khối Xem nội dung và vô hiệu nút Sao chép. */
let FULL = "";
fetch("TASKING.md")
  .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
  .then(t => { FULL = t.trim(); $("#full-pre").textContent = FULL; })
  .catch(() => { $("#full-pre").textContent = "Chưa tải được phần này, bạn thử tải lại trang."; $("#full-copy").disabled = true; });
$("#full-copy").addEventListener("click", e => { if (FULL) copyText(FULL, e.currentTarget, $("#full-pre")); });
$("#tpl-copy").addEventListener("click", e => copyText(currentTplText(), e.currentTarget, $("#tpl-body")));
$("#b-copy").addEventListener("click", e => copyText(buildPrompt(), e.currentTarget, $("#b-out")));

/* ----- Mục lục tự sinh ----- */
const secs = $$("section[data-nav]");
$("#toc").innerHTML = secs.map(s => `<a href="#${s.id}">${esc(s.dataset.nav)}</a>`).join("");
const links = $$("#toc a");
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(es => {
    es.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id)); });
  }, { rootMargin: "-40% 0px -55% 0px" });
  secs.forEach(s => io.observe(s));
}
