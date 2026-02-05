// --- STORAGE & STATE ---
const STORAGE_KEY = 'billing_db_v2';
let currentEditingId = null;

function getData() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        return json ? JSON.parse(json) : [];
    } catch (e) {
        console.error("Storage Error:", e);
        return [];
    }
}

function saveDataToStorage(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- ROW MANAGEMENT ---
function updateRowNumbers() {
    let vanCount = 0;
    document.querySelectorAll('#tableBody tr').forEach(row => {
        const numCell = row.cells[0]; // The first column
        if (row.dataset.type === "van-row") {
            vanCount++;
            numCell.innerText = vanCount;
        } else {
            numCell.innerText = ""; // Spacing/Fee rows get no number
        }
    });
}
function addRow(data = {}) {
    const tbody = document.getElementById('tableBody');
    if(!tbody) return;
    const tr = document.createElement('tr');
    tr.dataset.type = "van-row";
    
    // Added a <td> at the start for the number
    tr.innerHTML = `
        <td class="van-num"></td> 
        <td><input type="text" class="tbl-input van" value="${data.van || ''}"></td>
        <td><input type="text" class="tbl-input size" value="${data.size || "40'"}"></td>
        <td><input type="text" class="tbl-input p_out" value="${data.p_out || ''}"></td>
        <td><input type="text" class="tbl-input del" value="${data.del || ''}"></td>
        <td><input type="text" class="tbl-input p_mt" value="${data.p_mt || ''}"></td>
        <td><input type="text" class="tbl-input eir" value="${data.eir || ''}"></td>
        <td><input type="text" class="tbl-input remarks" value="${data.remarks || ''}"></td>
        <td><input type="text" step="0.01" class="tbl-input amt" value="${data.amt || ''}" onchange="formatAmount(this)"></td>
        <td class="no-print" style="text-align:center;">
            <button onclick="deleteRow(this)" style="background:red; color:white; border:none; width:25px; cursor:pointer;">x</button>
        </td>
    `;
    tbody.appendChild(tr);
    updateRowNumbers(); // Update numbers whenever a row is added
    calcTotal();
}
function addFeeRow(data = {}) {
    const tbody = document.getElementById('tableBody');
    if(!tbody) return;
    const tr = document.createElement('tr');
    tr.dataset.type = "fee-row";

    // Added an empty <td> at the start to keep alignment
    tr.innerHTML = `
        <td></td> 
        <td colspan="6">
            <input type="text" class="tbl-input fee-description" 
                   style="width: 100%; " 
                   placeholder="Enter fee description..." 
                   value="${data.fee_desc || ''}">
        </td>
        <td><input type="text" class="tbl-input remarks" value="${data.remarks || ''}"></td>
        <td><input type="text" step="0.01" class="tbl-input amt" value="${data.amt || ''}" onchange="formatAmount(this)"></td>
        <td class="no-print" style="text-align:center;">
            <button onclick="deleteRow(this)" style="background:red; color:white; border:none; width:25px; cursor:pointer;">x</button>
        </td>
    `;
    tbody.appendChild(tr);
    updateRowNumbers(); // Update numbers (ensures no number is assigned here)
    calcTotal();
}
function deleteRow(btn) {
    btn.closest('tr').remove();
    calcTotal();
}

function loadExistingRecord(record) {
    currentEditingId = record.id;
    document.getElementById('clientName').value = record.clientName;
    document.getElementById('billDate').value = record.date;
    document.getElementById('serviceDesc').value = record.service || '';
    if(document.getElementById('billNoInput')) document.getElementById('billNoInput').value = record.billNo || ''; 
    
    // NEW: Load the signature and footer data
    if(record.preparedBy) document.querySelector('.signatures-container .sig-name').innerText = record.preparedBy;
    if(record.preparedByTitle) document.querySelector('.signatures-container .sig-title').innerText = record.preparedByTitle;
    if(record.notedBy) document.querySelectorAll('.sig-name')[1].innerText = record.notedBy;
    if(record.totalWords) document.querySelector('.total-words').innerText = record.totalWords;
    if(record.footerNote) document.querySelector('.bottom-note').innerText = record.footerNote;

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    record.items.forEach(item => {
        if(item.type === "fee-row") addFeeRow(item);
        else addRow(item);
    });
    
    calcTotal();
    const editControls = document.getElementById('editControls');
    if(editControls) editControls.style.display = 'flex'; 
}


function openBillList() {
    const modal = document.getElementById('billListModal');
    const container = document.getElementById('billListContainer');
    const yearInput = document.getElementById('yearFilter')?.value.trim();
    const allData = getData();

    if(!modal || !container) return;
    container.innerHTML = ""; 
    modal.style.display = "block";

    const filtered = allData.filter(d => !yearInput || (d.date && d.date.startsWith(yearInput)));

    if (filtered.length === 0) {
        container.innerHTML = "<p style='text-align:center;'>No records found.</p>";
    } else {
        filtered.forEach(data => {
            const div = document.createElement('div');
            div.className = 'bill-item';
            div.style = "padding:10px; border-bottom:1px solid #ddd; cursor:pointer;";
            div.innerHTML = `<strong>${data.date}</strong> - ${data.billNo} - ${data.clientName}`;
            div.onclick = () => { loadExistingRecord(data); closeBillList(); };
            container.appendChild(div);
        });
    }
}

function closeBillList() { 
    const modal = document.getElementById('billListModal');
    if(modal) modal.style.display = "none"; 
}

// --- UTILS ---
// This cleans the input for calculation
function parseValue(val) {
    if (typeof val === 'number') return val;
    // Remove commas so parseFloat can read it correctly
    return parseFloat(val.replace(/,/g, '')) || 0;
}

// This adds the commas automatically
function formatAmount(input) {
    // 1. Get the raw number (remove existing commas)
    let rawValue = input.value.replace(/,/g, '');
    let number = Math.floor(parseFloat(rawValue));

    // 2. If it's a valid number, format it
    if (!isNaN(number)) {
        // Formats to "2,000" without decimals
        input.value = number.toLocaleString('en-US');
    }
}

// --- IMPROVED CALC TOTAL ---
function calcTotal() {
    let total = 0;
    document.querySelectorAll('.amt').forEach(field => {
        // FIX: Use parseValue instead of parseFloat
        total += parseValue(field.value); 
    });

    const display = document.getElementById('grandTotal');
    if(display) {
        display.innerText = total.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    const totalWordsDiv = document.querySelector('.total-words');
    if (totalWordsDiv) {
        totalWordsDiv.innerText = numberToEnglish(total);
    }
}


// --- SMART SAVE LOGIC ---
function saveRecord() {
    const clientName = document.getElementById('clientName')?.value.trim();
    const date = document.getElementById('billDate')?.value;
    const billNo = document.getElementById('billNoInput')?.value.trim();
    const service = document.getElementById('serviceDesc')?.value || '';
    
    if (!clientName || !date || !billNo) {
        alert("Error: Please enter Client Name, Date, and Bill Number.");
        return;
    }

    // Capture Signature/Footer Data
    const preparedBy = document.querySelector('.signatures-container .sig-name')?.innerText || 'Janna Dawn Magno';
    const preparedByTitle = document.querySelector('.signatures-container .sig-title')?.innerText || 'Billing Analyst';
    const notedBy = document.querySelectorAll('.sig-name')[1]?.innerText || 'Nerthus Yu Vega';
    const footerNote = document.querySelector('.bottom-note')?.innerText || '';
    const totalWords = document.querySelector('.total-words')?.innerText || '';

    const items = [];
    document.querySelectorAll('#tableBody tr').forEach(row => {
        items.push({
            type: row.dataset.type,
            van: row.querySelector('.van')?.value || '',
            size: row.querySelector('.size')?.value || '',
            p_out: row.querySelector('.p_out')?.value || '',
            del: row.querySelector('.del')?.value || '',
            p_mt: row.querySelector('.p_mt')?.value || '',
            fee_desc: row.querySelector('.fee-description')?.value || '',
            eir: row.querySelector('.eir')?.value || '',
            remarks: row.querySelector('.remarks')?.value || '',
            amt: row.querySelector('.amt')?.value || ''
        });
    });

    const newData = {
        id: currentEditingId || Date.now(),
        clientName, 
        date, 
        billNo,
        service,
        items,
        preparedBy,
        preparedByTitle,
        notedBy,
        footerNote,
        totalWords
    };

    let allData = getData();

    // MATCHING LOGIC: Find a record where Client, Date, AND Bill No all match
    const existingIndex = allData.findIndex(r => 
        r.billNo === billNo && 
        r.date === date && 
        r.clientName.toLowerCase() === clientName.toLowerCase()
    );

    if (existingIndex !== -1) {
        // Update existing entry
        newData.id = allData[existingIndex].id; // Keep the original internal ID
        allData[existingIndex] = newData;
        currentEditingId = newData.id;
        alert("🔄 RECORD UPDATED: Existing Bill found and updated.");
    } else {
        // Save as a new entry
        allData.push(newData);
        currentEditingId = newData.id;
        alert("✅ NEW RECORD SAVED: Different Client, Date, or Bill No detected.");
    }
    saveDataToStorage(allData);
}

function resetForm() {
    currentEditingId = null; 
    const ec = document.getElementById('editControls');
    if(ec) ec.style.display = 'none';
    document.getElementById('clientName').value = '';
    document.getElementById('serviceDesc').value = '';
    document.getElementById('billDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('tableBody').innerHTML = '';
    updateBillNumber();
    addRow(); 
}

function updateBillNumber() {
    if (currentEditingId) return;
    const dateVal = document.getElementById('billDate').value;
    const yearSuffix = dateVal ? dateVal.split('-')[0].slice(-2) : '26';
    const allData = getData();
    let maxNum = 1000;
    allData.forEach(r => {
        if (r.billNo) {
            const num = parseInt(r.billNo.split('-')[0]);
            if (num > maxNum) maxNum = num;
        }
    });
    const bInput = document.getElementById('billNoInput');
    if(bInput) bInput.value = `${maxNum + 1}-${yearSuffix}`;
}
function handleClientSearch(text) {
    const box = document.getElementById('suggestionBox');
    if (!box) return;
    box.innerHTML = ''; 
    if (text.length < 1) {
        box.style.display = 'none';
        return;
    }
    const allData = getData();
    
    // We want to find the LATEST record for each unique client
    const clientMap = new Map();

    allData.forEach(record => {
        const nameKey = record.clientName.toLowerCase().trim();
        // If it's a new name, or a newer record (based on ID/Timestamp), store it
        if (!clientMap.has(nameKey) || record.id > clientMap.get(nameKey).id) {
            clientMap.set(nameKey, record);
        }
    });

    const matches = Array.from(clientMap.values()).filter(record => 
        record.clientName.toLowerCase().includes(text.toLowerCase())
    );

    if (matches.length > 0) {
        box.style.display = 'block';
        matches.forEach(record => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<strong>${record.clientName}</strong> <br> 
                             <small style="color: #666;">Last service: ${record.service.substring(0, 30)}...</small>`;
            
            div.onclick = () => {
                autoFillFromRecord(record);
                box.style.display = 'none';
            };
            box.appendChild(div);
        });
    } else {
        box.style.display = 'none';
    }
}
function autoFillFromRecord(record) {
    // 1. Set the internal ID so the system knows we are EDITING, not creating new
    currentEditingId = record.id;

    // 2. Set the main header information
    document.getElementById('clientName').value = record.clientName;
    document.getElementById('serviceDesc').value = record.service || '';
    
    // 3. LOAD the specific Bill No and Date from that record
    if(document.getElementById('billDate')) {
        document.getElementById('billDate').value = record.date;
    }
    if(document.getElementById('billNoInput')) {
        document.getElementById('billNoInput').value = record.billNo || '';
    }

    // 4. Clear and Rebuild Table
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    record.items.forEach(item => {
        if(item.type === "fee-row") {
            addFeeRow(item);
        } else {
            addRow(item);
        }
    });

    // 5. Load the signatures and footer note
    if(record.preparedBy) document.querySelector('.signatures-container .sig-name').innerText = record.preparedBy;
    if(record.preparedByTitle) document.querySelector('.signatures-container .sig-title').innerText = record.preparedByTitle;
    if(record.notedBy) document.querySelectorAll('.sig-name')[1].innerText = record.notedBy;
    if(record.totalWords) document.querySelector('.total-words').innerText = record.totalWords;
    if(record.footerNote) document.querySelector('.bottom-note').innerText = record.footerNote;

    // 6. Show the print/delete controls
    const editControls = document.getElementById('editControls');
    if (editControls) {
        editControls.style.display = 'flex'; 
    }

    calcTotal();
}

// --- DELETE FUNCTION ---
function deleteRecord() {
    // Only allow deletion if we are currently editing an existing record
    if (!currentEditingId) {
        alert("No record is currently loaded to delete.");
        return;
    }
    // 1. Ask for confirmation
    const confirmDelete = confirm("⚠️ Are you sure you want to PERMANENTLY DELETE this bill?\nThis action cannot be undone.");
    if (confirmDelete) {
        // 2. Get the current database
        let allData = getData();
        // 3. Filter out the record with the matching ID
        const newData = allData.filter(record => record.id !== currentEditingId);
        // 4. Update LocalStorage
        saveDataToStorage(newData);
        alert("🗑️ Record Deleted Successfully.");
        // 5. Reset the form to clear the deleted data from the screen
        resetForm();
    }
}
function numberToEnglish(n) {
    if (n === 0) return "Zero Pesos Only";
    
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const scales = ["", "Thousand", "Million"];

    function chunkToWords(num) {
        let str = "";
        if (num >= 100) {
            str += units[Math.floor(num / 100)] + " Hundred ";
            num %= 100;
        }
        if (num >= 20) {
            str += tens[Math.floor(num / 10)] + " ";
            num %= 10;
        }
        if (num > 0) {
            str += units[num] + " ";
        }
        return str;
    }

    let words = "";
    let scaleIndex = 0;
    let integerPart = Math.floor(n);

    while (integerPart > 0) {
        let chunk = integerPart % 1000;
        if (chunk > 0) {
            words = chunkToWords(chunk) + scales[scaleIndex] + " " + words;
        }
        integerPart = Math.floor(integerPart / 1000);
        scaleIndex++;
    }

    return words.trim() + " Pesos Only";
}

function printBill() { window.print(); }

// --- INIT ---
window.onload = () => {
    document.getElementById('billDate')?.addEventListener('change', updateBillNumber);
    resetForm();
};
// --- AUTOMATIC PRINT LOGIC ---
window.onbeforeprint = function() {
    const tableBody = document.getElementById('tableBody');
    const rows = Array.from(tableBody.querySelectorAll('tr'));
    const rowCount = rows.length;
    
    const billNoValue = document.getElementById('billNoInput')?.value || "XXXX-XX";
    const container = document.querySelector('.container');
    const footerSummary = document.querySelector('.footer-summary');
    const sigContainer = document.querySelector('.signatures-container');
    const bottomNote = document.querySelector('.bottom-note');
    const page1Header = document.querySelector('.letterhead');

    // 1. Setup Page 1 Header
    // We add a class to the info div so we can easily find it in clones
    const page1Info = document.createElement('div');
    page1Info.id = 'temp-page1-info';
    page1Info.className = 'bill-info-print'; 
    const pageLabelHtml = (rowCount > 10) ? `<div class="print-page-label">Page 1</div>` : '';
    page1Info.innerHTML = `<div>BILL NO: ${billNoValue}</div>${pageLabelHtml}`;
    page1Header.appendChild(page1Info);

    if (rowCount > 10) {
        let remainingRows = rows.slice(20); 
        let currentPageNum = 2;

        const contNote1 = document.createElement('div');
        contNote1.id = 'temp-cont-note-1';
        contNote1.className = 'continuation-note';
        contNote1.innerText = `*** Continuation on Page 2 ***`;
        container.insertBefore(contNote1, footerSummary);

        while (true) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'force-page-break temp-print-page';
            
            // --- HEADER CLONING ---
            const clonedHeader = page1Header.cloneNode(true);
            clonedHeader.classList.add('print-header-clone');
            
            // UPDATE LABEL IN CLONE
            const clonedLabel = clonedHeader.querySelector('.print-page-label');
            if (clonedLabel) clonedLabel.innerText = `Page ${currentPageNum}`;
            
            pageDiv.appendChild(clonedHeader);

            const moveFooterThreshold = 14;
            const maxCapacity = 26;
            
            let sliceSize = (remainingRows.length > moveFooterThreshold) ? maxCapacity : remainingRows.length;
            const pageRows = remainingRows.splice(0, sliceSize);

            // Table Logic
            if (pageRows.length > 0) {
                const originalTable = document.getElementById('billingTable');
                const newTable = document.createElement('table');
                newTable.id = 'billingTable'; 
                newTable.className = originalTable.className;
                newTable.style.cssText = originalTable.style.cssText;
                newTable.appendChild(originalTable.querySelector('thead').cloneNode(true));
                const newTbody = document.createElement('tbody');
                pageRows.forEach(row => newTbody.appendChild(row));
                newTable.appendChild(newTbody);
                pageDiv.appendChild(newTable);
            }

            // --- FOOTER PLACEMENT ---
            if (remainingRows.length === 0 && pageRows.length <= moveFooterThreshold) {
                pageDiv.appendChild(footerSummary);
                pageDiv.appendChild(sigContainer);
                pageDiv.appendChild(bottomNote);
                container.appendChild(pageDiv);
                break; 
            } else {
                const midContNote = document.createElement('div');
                midContNote.className = 'continuation-note';
                midContNote.innerText = `*** Continuation on Page ${currentPageNum + 1} ***`;
                pageDiv.appendChild(midContNote);
                container.appendChild(pageDiv);

                currentPageNum++;

if (remainingRows.length === 0) {
    // THIS IS PAGE 3 (OR THE FINAL FOOTER-ONLY PAGE)
    const lastPage = document.createElement('div');
    lastPage.className = 'force-page-break temp-print-page';
    
    // 1. RE-CLONE HEADER
    const finalHeader = page1Header.cloneNode(true);
    finalHeader.classList.add('print-header-clone');
    
    // 2. FIX: Manually find the info div inside this specific clone
    // We use querySelector on 'finalHeader' to ensure we touch only this page's header
    const finalInfo = finalHeader.querySelector('.bill-info-print');
    
    if (finalInfo) {
        const finalPageNum = currentPageNum; // Increment to Page 3
        finalInfo.innerHTML = `
            <div>BILL NO: ${billNoValue}</div>
            <div class="print-page-label">Page ${finalPageNum}</div>
        `;
    }
    
    // 3. Assemble the page
    lastPage.appendChild(finalHeader);
    lastPage.appendChild(footerSummary);
    lastPage.appendChild(sigContainer);
    lastPage.appendChild(bottomNote);
    container.appendChild(lastPage);
    break;
}

            }
        }
    }
};

window.onafterprint = function() {
    const tempPages = document.querySelectorAll('.temp-print-page');
    const page1Info = document.getElementById('temp-page1-info');
    const contNote1 = document.getElementById('temp-cont-note-1');
    const tableBody = document.getElementById('tableBody');
    const container = document.querySelector('.container');
    const footerSummary = document.querySelector('.footer-summary');
    const sigContainer = document.querySelector('.signatures-container');
    const bottomNote = document.querySelector('.bottom-note');

    if (page1Info) page1Info.remove();
    if (contNote1) contNote1.remove();

    tempPages.forEach(page => {
        const movedRows = Array.from(page.querySelectorAll('tbody tr'));
        movedRows.forEach(row => tableBody.appendChild(row));
        page.remove();
    });

    container.appendChild(footerSummary);
    container.appendChild(sigContainer);
    container.appendChild(bottomNote);
};
document.addEventListener('DOMContentLoaded', function () {
    const table = document.getElementById('billingTable');
    const cols = table.querySelectorAll('th');

    cols.forEach((col) => {
        const resizer = document.createElement('div');
        resizer.classList.add('resizer');
        col.appendChild(resizer);

        let x = 0;
        let w = 0;

        // Function to handle the start of the drag (Mouse or Touch)
        const onStart = function (e) {
            // Get the horizontal position (e.touches[0] for tablet, e.clientX for PC)
            x = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            
            const styles = window.getComputedStyle(col);
            w = parseInt(styles.width, 10);

            // Listen for movement
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
            
            resizer.classList.add('resizing');
        };

        // Function to handle the movement
const onMove = function (e) {
    const currentX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const dx = currentX - x;
    
    // Set a minimum width (e.g., 30px) so columns don't disappear
    const newWidth = w + dx;
    if (newWidth > 30) { 
        col.style.width = `${newWidth}px`;
    }
    
    if (e.type === 'touchmove') e.preventDefault();
};

        // Function to stop the drag
        const onEnd = function () {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            document.removeEventListener('touchmove', onMove);
            document.removeEventListener('touchend', onEnd);
            resizer.classList.remove('resizing');
        };

        // Attach both event types
        resizer.addEventListener('mousedown', onStart);
        resizer.addEventListener('touchstart', onStart);
    });
});
