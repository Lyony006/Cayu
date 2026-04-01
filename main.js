// 1. Check if user is already "Remembered" as soon as the page loads
window.onload = function() {
    if (localStorage.getItem("cayu_authorized") === "true") {
        document.getElementById('auth-gate').style.display = "none";
    }
};

function checkAccess() {
    const passField = document.getElementById('passInput');
    const webKeyContainer = document.getElementById('web-key-container');
    const authGate = document.getElementById('auth-gate');
    const rememberMe = document.getElementById('rememberMe');
    
    const correctPassword = "12"; 

    if (passField.value === correctPassword) {
        // If "Remember Me" is checked, save to localStorage
        if (rememberMe.checked) {
            localStorage.setItem("cayu_authorized", "true");
        }

        // Smooth Fade Out
        authGate.style.opacity = "0";
        setTimeout(() => {
            authGate.style.display = "none";
        }, 500);
    } else {
        // Wrong password logic
        alert("Incorrect Key.");
        webKeyContainer.style.display = "block";
        passField.value = ""; 
        
        // Optional: Shake effect
        const card = document.querySelector('.login-card');
        card.style.transform = "translateX(10px)";
        setTimeout(() => card.style.transform = "translateX(-10px)", 100);
        setTimeout(() => card.style.transform = "translateX(0)", 200);
    }
}

// Allow pressing "Enter" to submit
document.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        if(document.getElementById('auth-gate').style.display !== "none") {
            checkAccess();
        }
    }
});

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
        <td><input type="text" class="tbl-input cy mt rtrn" value="${data.cymrtrn || ''}"></td>
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
        <td colspan="7">
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
function parseValue(value) {
    // Remove commas and then turn into a floating point number
    let cleanValue = value.replace(/,/g, '');
    let num = parseFloat(cleanValue);
    return isNaN(num) ? 0 : num;
}


// This adds the commas automatically
function formatAmount(input) {
    // 1. Get the raw value and remove existing commas
    let rawValue = input.value.replace(/,/g, '');
    
    // 2. Convert to a number
    let number = parseFloat(rawValue);

    // 3. If it's a valid number, format it with commas and 2 decimals
    if (!isNaN(number)) {
        input.value = number.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}



// --- IMPROVED CALC TOTAL ---
function calcTotal() {
    let total = 0;
    // Select all your amount fields
    document.querySelectorAll('.amt').forEach(field => {
        total += parseValue(field.value); 
    });

    // Update the Numeric Display (e.g., 13,900.00)
    const display = document.getElementById('grandTotal');
    if(display) {
        display.innerText = total.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Update the Words (e.g., Thirteen Thousand Pesos & 50/100 Only)
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
    
    // 1. Separate Whole Number and Centavos
    const integerPart = Math.floor(n);
    const cents = Math.round((n - integerPart) * 100); // Standard way to get 2-digit cents

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
    let tempInteger = integerPart;

    // 2. Process the Pesos (Integer Part)
    while (tempInteger > 0) {
        let chunk = tempInteger % 1000;
        if (chunk > 0) {
            words = chunkToWords(chunk) + (scales[scaleIndex] ? scales[scaleIndex] + " " : "") + words;
        }
        tempInteger = Math.floor(tempInteger / 1000);
        scaleIndex++;
    }

    words = words.trim();

    // 3. Combine Pesos and Centavos
    if (cents > 0) {
        // Example: "One Thousand Two Hundred Pesos & 50/100 Only"
        return `${words} Pesos & ${cents} Centavos Only`;
    } else {
        // Example: "One Thousand Two Hundred Pesos Only"
        return `${words} Pesos Only`;
    }
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
    const footerSummary = document.querySelector('.footer-summary-container');
    const sigContainer = document.querySelector('.signatures-container');
    const bottomNote = document.querySelector('.bottom-note');
    const page1Header = document.querySelector('.letterhead');

    // --- STEP 1: CALCULATE TOTAL PAGES ---
    let totalPages = 1;
    const p1Limit = 20;         
    const p1Threshold = 10;     
    const pnLimit = 25;         
    const pnThreshold = 14;     

    if (rowCount <= p1Threshold) {
        totalPages = 1;
    } else if (rowCount <= p1Limit) {
        totalPages = 2;
    } else {
        totalPages = 2; 
        let remaining = rowCount - p1Limit;
        while (remaining > 0) {
            if (remaining <= pnThreshold) { remaining = 0; }
            else if (remaining <= pnLimit) { totalPages += 1; remaining = 0; }
            else { totalPages += 1; remaining -= pnLimit; }
        }
    }

    // --- STEP 2: SETUP PAGE 1 LABEL ---
    const page1Info = document.createElement('div');
    page1Info.id = 'temp-page1-info';
    page1Info.className = 'bill-info-print'; 
    page1Info.innerHTML = `
        <div>BILL NO: ${billNoValue}</div>
        <div class="print-page-label">Page 1 of ${totalPages}</div>
    `;
    page1Header.appendChild(page1Info);

    // --- STEP 3: GENERATE SUBSEQUENT PAGES ---
    if (rowCount > p1Threshold) {
        let remainingRows = rows.slice(p1Limit); 
        let currentPageNum = 2;

        const contNote1 = document.createElement('div');
        contNote1.id = 'temp-cont-note-1';
        contNote1.className = 'continuation-note';
        contNote1.innerText = `*** Continuation on Page ${currentPageNum} ***`;
        container.insertBefore(contNote1, footerSummary);

        while (true) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'force-page-break temp-print-page';
            
            // 1. Clone Header
            const clonedHeader = page1Header.cloneNode(true);
            clonedHeader.classList.add('print-header-clone');
            
            // 2. Ensure Bill No and Page Label exist in this clone
            let clonedInfo = clonedHeader.querySelector('.bill-info-print');
            if (!clonedInfo) {
                clonedInfo = document.createElement('div');
                clonedInfo.className = 'bill-info-print';
                clonedHeader.appendChild(clonedInfo);
            }
            clonedInfo.innerHTML = `
                <div>BILL NO: ${billNoValue}</div>
                <div class="print-page-label">Page ${currentPageNum} of ${totalPages}</div>
            `;
            
            pageDiv.appendChild(clonedHeader);

            // 3. Re-add "DETAILS (CONTINUED)"
            const originalDetails = document.querySelector('.table-details');
            if (originalDetails) {
                const clonedDetails = originalDetails.cloneNode(true);
                clonedDetails.innerText = "DETAILS (CONTINUED)"; 
                pageDiv.appendChild(clonedDetails);
            }

            // 4. Calculate rows for THIS page
            let sliceSize = (remainingRows.length > pnThreshold) ? pnLimit : remainingRows.length;
            const pageRows = remainingRows.splice(0, sliceSize);

            if (pageRows.length > 0) {
                const originalTable = document.getElementById('billingTable');
                const newTable = document.createElement('table');
                newTable.className = originalTable.className + " billing-table-print"; 
                newTable.appendChild(originalTable.querySelector('thead').cloneNode(true));
                const newTbody = document.createElement('tbody');
                pageRows.forEach(row => newTbody.appendChild(row));
                newTable.appendChild(newTbody);
                pageDiv.appendChild(newTable);
            }

            // 5. DECISION LOGIC: Finish or Continue?
            if (remainingRows.length === 0 && pageRows.length <= pnThreshold) {
                pageDiv.appendChild(footerSummary);
                pageDiv.appendChild(sigContainer);
                pageDiv.appendChild(bottomNote);
                container.appendChild(pageDiv);
                break; 
            } else {
                const nextP = currentPageNum + 1;
                const midContNote = document.createElement('div');
                midContNote.className = 'continuation-note';
                midContNote.innerText = `*** Continuation on Page ${nextP} ***`;
                pageDiv.appendChild(midContNote);
                container.appendChild(pageDiv);

                currentPageNum++;

                // --- FINAL PAGE FIX (When only signatures remain) ---
                if (remainingRows.length === 0) {
                    const finalPage = document.createElement('div');
                    finalPage.className = 'force-page-break temp-print-page';
                    
                    const finalHeader = page1Header.cloneNode(true);
                    finalHeader.classList.add('print-header-clone');
                    
                    // Force the Bill Info into the final page header
                    let finalInfo = finalHeader.querySelector('.bill-info-print');
                    if (!finalInfo) {
                        finalInfo = document.createElement('div');
                        finalInfo.className = 'bill-info-print';
                        finalHeader.appendChild(finalInfo);
                    }
                    finalInfo.innerHTML = `
                        <div>BILL NO: ${billNoValue}</div>
                        <div class="print-page-label">Page ${currentPageNum} of ${totalPages}</div>
                    `;
                    
                    finalPage.appendChild(finalHeader);
                    finalPage.appendChild(footerSummary);
                    finalPage.appendChild(sigContainer);
                    finalPage.appendChild(bottomNote);
                    container.appendChild(finalPage);
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
    const footerSummary = document.querySelector('.footer-summary-container');
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
