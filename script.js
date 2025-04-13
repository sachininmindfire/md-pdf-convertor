// Initialize Mermaid with custom configuration
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    flowchart: {
        htmlLabels: false,
        useMaxWidth: false
    }
});

// DOM elements
const markdownInput = document.getElementById('markdown-input');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const pdfPreview = document.getElementById('pdf-preview');
const downloadPdfBtn = document.getElementById('download-pdf');
let isProcessing = false;
let currentFileName = 'document'; // Add this line to store filename

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileUpload);
    markdownInput.addEventListener('input', generatePdfPreview);
    downloadPdfBtn.addEventListener('click', async () => {
        if (!isProcessing) {
            isProcessing = true;
            downloadPdfBtn.disabled = true;
            downloadPdfBtn.textContent = 'Processing...';
            await downloadPdf();
            downloadPdfBtn.disabled = false;
            downloadPdfBtn.textContent = 'Download PDF';
            isProcessing = false;
        }
    });
});

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(md|markdown)$/i)) {
        alert('Please upload a Markdown file (.md or .markdown)');
        return;
    }

    // Store filename without extension
    currentFileName = file.name.replace(/\.(md|markdown)$/i, '');

    const reader = new FileReader();
    reader.onload = (e) => {
        markdownInput.value = e.target.result;
        generatePdfPreview();
    };
    reader.onerror = () => alert('Error reading file');
    reader.readAsText(file);
}

// Generate PDF preview with proper styling
async function generatePdfPreview() {
    try {
        const markdown = markdownInput.value;
        if (!markdown.trim()) {
            pdfPreview.innerHTML = '<p style="font-size:12px">Enter some markdown to see the preview</p>';
            return;
        }

        // Pre-process Mermaid code to replace % with hyphens
        const processedMarkdown = markdown.replace(/```mermaid([\s\S]*?)```/g, (match, code) => {
            return '```mermaid' + code.replace(/%/g, '-') + '```';
        });

        // Generate HTML with consistent styling (12px font)
        const html = `
            <div style="font-family:Arial,sans-serif;font-size:12px;line-height:1.4">
                ${marked.parse(processedMarkdown)}
            </div>
        `;
        
        pdfPreview.innerHTML = html;
        
        // Render Mermaid diagrams with delay
        await new Promise(resolve => setTimeout(resolve, 500));
        await mermaid.run({
            nodes: pdfPreview.querySelectorAll('.mermaid'),
            suppressErrors: true
        });
    } catch (error) {
        console.error('Preview error:', error);
    }
}

/**
 * Downloads markdown content as a lightweight PDF using direct text rendering
 * instead of canvas-based approaches for smaller file size
 */
async function downloadPdf() {
    try {
        // Get the jsPDF instance
        const { jsPDF } = window.jspdf;
        
        // Create PDF document
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Get the content element and extract text content
        const previewElement = document.getElementById('pdf-preview');
        
        // PDF settings
        const margins = {
            top: 15,
            right: 15,
            bottom: 15,
            left: 15
        };
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentWidth = pageWidth - margins.left - margins.right;
        
        let currentY = margins.top;
        let currentPage = 1;
        
        // Set up text styles
        const styles = {
            normal: {
                fontSize: 10,
                fontStyle: 'normal',
                lineHeight: 5
            },
            h1: {
                fontSize: 18,
                fontStyle: 'bold',
                lineHeight: 10
            },
            h2: {
                fontSize: 16,
                fontStyle: 'bold', 
                lineHeight: 8
            },
            h3: {
                fontSize: 14,
                fontStyle: 'bold',
                lineHeight: 7
            },
            code: {
                fontSize: 8,
                fontStyle: 'normal',
                lineHeight: 4
            }
        };
        
        // Function to add text with proper wrapping and pagination
        function addText(text, style) {
            // Skip empty text
            if (!text.trim()) return;
            
            // Set font based on style
            doc.setFontSize(style.fontSize);
            if (style.fontStyle === 'bold') {
                doc.setFont(undefined, 'bold');
            } else {
                doc.setFont(undefined, 'normal');
            }
            
            // Check if we need a new page
            if (currentY > pageHeight - margins.bottom - style.lineHeight) {
                doc.addPage();
                currentPage++;
                currentY = margins.top;
            }
            
            // Split text to fit within page width
            const textLines = doc.splitTextToSize(text, contentWidth);
            
            // Add each line
            textLines.forEach(line => {
                doc.text(line, margins.left, currentY);
                currentY += style.lineHeight;
                
                // Check if we need a new page after this line
                if (currentY > pageHeight - margins.bottom - style.lineHeight && 
                    textLines.indexOf(line) < textLines.length - 1) {
                    doc.addPage();
                    currentPage++;
                    currentY = margins.top;
                }
            });
            
            // Add extra space after text block
            currentY += style.lineHeight / 2;
        }
        
        // Function to add code block
        function addCodeBlock(code, language) {
            // Create a box for the code
            const boxHeight = Math.min(100, code.split('\n').length * styles.code.lineHeight + 8);
            
            // Check if we need a new page
            if (currentY + boxHeight > pageHeight - margins.bottom) {
                doc.addPage();
                currentPage++;
                currentY = margins.top;
            }
            
            // Draw a light gray background
            doc.setFillColor(245, 245, 245);
            doc.rect(margins.left, currentY, contentWidth, boxHeight, 'F');
            
            // Add a border
            doc.setDrawColor(200, 200, 200);
            doc.rect(margins.left, currentY, contentWidth, boxHeight, 'S');
            
            // If we have a language, add it as a header
            //if (language) {
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.text(language, margins.left + 2, currentY + 4);
                currentY += 6;               
            //}
            
            // Set code font
            doc.setFontSize(styles.code.fontSize);
            doc.setTextColor(0, 0, 0);
            doc.setFont('courier', 'normal');
            
            // Split code into lines
            const codeLines = code.split('\n');
            const maxLines = 40; // Limit to prevent very large code blocks
            
           
            // Add each line with proper indentation preserved
            codeLines.slice(0, maxLines).forEach((line, index) => {
                // Handle continuation of same code block on next page
                if (currentY > pageHeight - margins.bottom - styles.code.lineHeight) {
                    doc.addPage();
                    currentPage++;
                    currentY = margins.top;
                    
                    // Redraw the code box on the new page
                    const remainingLines = codeLines.length - index;
                    const newBoxHeight = Math.min(100, remainingLines * styles.code.lineHeight + 4);
                    
                    doc.setFillColor(245, 245, 245);
                    doc.rect(margins.left, currentY, contentWidth, newBoxHeight, 'F');
                    
                    doc.setDrawColor(200, 200, 200);
                    doc.rect(margins.left, currentY, contentWidth, newBoxHeight, 'S');
                    
                    doc.setFontSize(styles.code.fontSize);
                    doc.setTextColor(0, 0, 0);
                    doc.setFont('courier', 'normal');
                }
                
                // Add padding for code text
                doc.text(line, margins.left + 4, currentY + 4);
                currentY += styles.code.lineHeight;
            });
            
            // If code was truncated, add an indicator
            if (codeLines.length > maxLines) {
                doc.setTextColor(100, 100, 100);
                doc.text(`[...${codeLines.length - maxLines} more lines...]`, 
                         margins.left + 4, currentY + 4);
                currentY += styles.code.lineHeight * 2;
            } else {
                currentY += styles.code.lineHeight;
            }
            
            // Reset text settings
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
        }
        
        // Process the document by parsing elements
        function processElements() {
            // Add document title
            const titleElement = previewElement.querySelector('h1');
            if (titleElement) {
                addText(titleElement.textContent, styles.h1);
            }
            
            // Process all elements in order
            Array.from(previewElement.children[0]?.children).forEach(element => {
                // Skip the title if we already processed it
                if (element === titleElement) return;
                
                // Process based on element type
                if (element.tagName === 'H1') {
                    // Start h1 sections on a new page
                    if (currentY > margins.top + styles.h1.lineHeight) {
                        doc.addPage();
                        currentPage = 1;
                        currentY = margins.top;
                    }
                    addText(element.textContent, styles.h1);
                }
                else if (element.tagName === 'H2') {
                    // Add extra space before h2
                    currentY += styles.h2.lineHeight;
                    addText(element.textContent, styles.h2);
                }
                else if (element.tagName === 'H3') {
                    addText(element.textContent, styles.h3);
                }
                else if (element.tagName === 'P') {
                    addText(element.textContent, styles.normal);
                }
                else if (element.tagName === 'UL' || element.tagName === 'OL') {
                    Array.from(element.children).forEach((li, index) => {
                        // Create bullet or number
                        const prefix = element.tagName === 'UL' ? 
                            '• ' : `${index + 1}. `;
                        addText(prefix + li.textContent, styles.normal);
                    });
                }
                else if (element.tagName === 'PRE') {
                    // Check for code block
                    const code = element.textContent;
                    const codeElement = element.querySelector('code');
                    const language = codeElement ? 
                        codeElement.className.replace('language-', '') : '';
                    
                    addCodeBlock(code, language);
                }
                else if (element.className && element.className.includes('mermaid')) {
                    // For mermaid diagrams, add a placeholder
                    addText('[Mermaid Diagram - See original document]', styles.normal);
                    currentY += styles.normal.lineHeight;
                }
                else {
                    // Default handling for other elements
                    addText(element.textContent, styles.normal);
                }
            });
        }
        
        // Add a lightweight table of contents
        function addTableOfContents() {
            doc.setPage(1);
            
            // Find all headings
            const headings = Array.from(previewElement.querySelectorAll('h1, h2, h3'));
            
            if (headings.length <= 1) return; // Skip if only title or no headings
            
            // Add TOC title
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Contents', margins.left, currentY);
            currentY += 10;
            
            // Add each heading
            headings.forEach(heading => {
                const level = parseInt(heading.tagName.substring(1));
                const indent = (level - 1) * 5;
                
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                
                // Format based on heading level
                if (level === 1) {
                    doc.setFont(undefined, 'bold');
                }
                
                // Add the table of contents entry
                doc.text(heading.textContent, margins.left + indent, currentY);
                currentY += 5;
            });
            
            // Add some space after TOC
            currentY += 10;
        }
        
        // Add table of contents
        addTableOfContents();
        
        // Process the document content
        processElements();
        
        // Save the PDF with the stored filename
        doc.save(`${currentFileName}.pdf`);
        
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF: ' + error.message);
    }
}