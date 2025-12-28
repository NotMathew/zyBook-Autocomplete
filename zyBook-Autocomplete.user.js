// ==UserScript==
// @name         zyBooks Autocomplete
// @version      0.1
// @description  Autocomplete for zyBooks
// @author       NotMathew
// @match        https://learn.zybooks.com/zybook/*
// @namespace    https://github.com/NotMathew/zyBook-Autocomplete
// @run-at       document-idle
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('zyBooks Autocomplete Enhanced (Fixed) loaded');

    // Settings - BALANCED SPEED MODE (Fast but Reliable)
    const AUTO_RUN = true;
    const DELAY_AFTER_SHOW_ANSWER = 800; // Give time for answer to load
    const DELAY_BETWEEN_QUESTIONS = 300; // Reasonable spacing
    const CLICK_DELAY = 100; // Enough for UI to register
    const SUBMIT_DELAY = 250; // Time for input to register
    const TYPING_DELAY = 0; // Instant typing
    const RETRY_DELAY = 500; // Time for zyBooks to process and show result

    let isRunning = false;
    let processedElements = new Set();

    // Main function
    function runAutoComplete() {
        if (isRunning) return;
        isRunning = true;

        console.log('🚀 Starting zyBooks autocomplete...');

        // Step 1: Click all Show Answer buttons
        clickShowAnswerButtons();

        // Step 2: Wait longer for answers to fully appear, then fill them
        setTimeout(() => {
            fillAllAnswers();
            isRunning = false;
        }, DELAY_AFTER_SHOW_ANSWER);
    }

    // Click Show Answer buttons (twice if needed) - EXTREME SPEED
    function clickShowAnswerButtons() {
        const showAnswerButtons = $('button').filter(function() {
            const text = $(this).text().trim().toLowerCase();
            return (text === 'show answer' || text === 'show answers') && $(this).is(':visible');
        });

        console.log(`📝 Found ${showAnswerButtons.length} Show Answer buttons`);

        showAnswerButtons.each(function(index) {
            const btn = $(this);
            const elementId = getElementUniqueId(btn[0]);
            
            if (processedElements.has(elementId + '-double-clicked')) {
                return;
            }

            // First click - almost instant
            setTimeout(() => {
                btn[0].click();
                
                // Second click - very short delay
                setTimeout(() => {
                    btn[0].click();
                    btn.addClass('auto-processed');
                    processedElements.add(elementId + '-double-clicked');
                }, 150); // Reduced from 300ms
            }, index * CLICK_DELAY);
        });
    }

    // Fill answers into input fields
    function fillAllAnswers() {
        console.log('🔍 Looking for answers to fill...');

        // Find all question containers
        const questions = $('.question-set-question, .zb-activity, .question-container, [class*="question"]').filter(':visible');

        console.log(`📋 Found ${questions.length} potential question containers`);

        questions.each(function(index) {
            const question = $(this);
            const elementId = getElementUniqueId(question[0]);
            
            if (processedElements.has(elementId + '-filled')) {
                console.log(`⏭️  Question ${index + 1} already processed`);
                return;
            }

            setTimeout(() => {
                processQuestion(question, index);
                processedElements.add(elementId + '-filled');
            }, index * DELAY_BETWEEN_QUESTIONS);
        });
    }

    // Process a single question - IMPROVED for multiple choice
    function processQuestion(question, index) {
        console.log(`\n📌 Processing question ${index + 1}`);

        // Check if already answered correctly
        if (question.find('.correct, .answered-correctly, .zb-correct').length > 0) {
            console.log(`✅ Question ${index + 1} already correct, skipping`);
            return;
        }

        // Determine question type
        const hasRadioButtons = question.find('input[type="radio"]').length > 0;
        const hasCheckboxes = question.find('input[type="checkbox"]').length > 0;
        const hasTextInput = question.find('input[type="text"], textarea').length > 0;

        if (hasRadioButtons || hasCheckboxes) {
            console.log(`🎯 Multiple choice question detected`);
            handleMultipleChoice(question, index);
        } else if (hasTextInput) {
            console.log(`✍️  Text input question detected`);
            handleTextInput(question, index);
        } else {
            console.log(`❓ Unknown question type, trying text input`);
            handleTextInput(question, index);
        }
    }

    // Handle multiple choice questions - CLICK LABEL METHOD
    function handleMultipleChoice(question, index) {
        // Find all clickable labels/choices instead of just inputs
        const choices = question.find('label, .choice, .option, [role="radio"]').filter(':visible');
        
        if (choices.length === 0) {
            console.log(`❌ No choices found, trying inputs...`);
            // Fallback to inputs
            handleMultipleChoiceByInput(question, index);
            return;
        }

        console.log(`📋 Found ${choices.length} clickable choices`);

        let currentChoiceIndex = 0;
        let attempts = 0;
        const maxAttempts = choices.length * 2;

        function tryNextChoice() {
            attempts++;
            
            if (attempts > maxAttempts) {
                console.log(`⚠️  Max attempts reached`);
                return;
            }

            const isCorrect = question.find('.correct, .answered-correctly, .zb-correct, [class*="correct"]').filter(function() {
                return !$(this).hasClass('incorrect') && !$(this).hasClass('zb-incorrect');
            }).length > 0;

            if (isCorrect) {
                console.log(`✅ Question ${index + 1} correct!`);
                return;
            }

            if (currentChoiceIndex >= choices.length) {
                console.log(`⚠️  Tried all choices`);
                return;
            }

            const choice = $(choices[currentChoiceIndex]);
            const choiceText = choice.text().trim().substring(0, 30);
            console.log(`🎯 Clicking choice ${currentChoiceIndex + 1}/${choices.length}: "${choiceText}..."`);

            // Method 1: Direct label click (most reliable for zyBooks)
            choice[0].click();
            
            // Method 2: Find and click associated input
            const input = choice.find('input[type="radio"], input[type="checkbox"]').first();
            if (input.length) {
                input.prop('checked', true);
                input[0].click();
            }

            // Method 3: If label has 'for' attribute, click that input
            const forAttr = choice.attr('for');
            if (forAttr) {
                const targetInput = $(`#${forAttr}`);
                if (targetInput.length) {
                    targetInput.prop('checked', true);
                    targetInput[0].click();
                }
            }

            // Give time for selection to register
            setTimeout(() => {
                // Find and click Check button
                const checkBtn = question.find('button').filter(function() {
                    const text = $(this).text().trim().toLowerCase();
                    return (text === 'check' || text === 'submit') && $(this).is(':visible');
                }).first();

                if (checkBtn.length) {
                    console.log(`🚀 Clicking Check...`);
                    checkBtn.removeClass('auto-clicked');
                    checkBtn[0].click();

                    // Wait for result
                    setTimeout(() => {
                        const hasIncorrect = question.find('.incorrect, .zb-incorrect, .wrong, [class*="incorrect"]').length > 0;
                        const hasCorrect = question.find('.correct, .answered-correctly, .zb-correct, [class*="correct"]').filter(function() {
                            return !$(this).hasClass('incorrect');
                        }).length > 0;

                        console.log(`📊 Result - Incorrect: ${hasIncorrect}, Correct: ${hasCorrect}`);

                        if (hasCorrect && !hasIncorrect) {
                            console.log(`✅ CORRECT!`);
                            return;
                        } else {
                            console.log(`❌ Wrong, trying next...`);
                            currentChoiceIndex++;
                            setTimeout(tryNextChoice, 300);
                        }
                    }, RETRY_DELAY);
                } else {
                    console.log(`⚠️  No Check button found`);
                    currentChoiceIndex++;
                    setTimeout(tryNextChoice, 200);
                }
            }, 300); // Increased delay for selection
        }

        tryNextChoice();
    }

    // Fallback method - click inputs directly
    function handleMultipleChoiceByInput(question, index) {
        const options = question.find('input[type="radio"], input[type="checkbox"]').filter(':visible');
        
        if (options.length === 0) {
            console.log(`❌ No inputs found either`);
            return;
        }

        console.log(`📋 Fallback: Found ${options.length} inputs`);

        let currentOptionIndex = 0;

        function tryNextOption() {
            if (currentOptionIndex >= options.length) return;

            const option = $(options[currentOptionIndex]);
            console.log(`🎯 Trying input ${currentOptionIndex + 1}/${options.length}`);

            // Click the input
            option.prop('checked', true);
            option[0].click();

            setTimeout(() => {
                const checkBtn = question.find('button:contains("Check"), button:contains("Submit")').filter(':visible').first();
                if (checkBtn.length) {
                    checkBtn[0].click();
                    
                    setTimeout(() => {
                        const isCorrect = question.find('.correct').length > 0 && question.find('.incorrect').length === 0;
                        if (!isCorrect) {
                            currentOptionIndex++;
                            setTimeout(tryNextOption, 300);
                        }
                    }, RETRY_DELAY);
                }
            }, 300);
        }

        tryNextOption();
    }

    // Handle text input questions - EXTREME SPEED
    function handleTextInput(question, index) {
        const answerInfo = findAnswer(question);
        
        if (!answerInfo || !answerInfo.answer) {
            console.log(`❌ No answer found`);
            return;
        }

        console.log(`💡 Answer: "${answerInfo.answer}"`);

        if (fillTextAnswer(question, answerInfo.answer)) {
            setTimeout(() => clickSubmitButton(question, index), SUBMIT_DELAY);
        }
    }

    // Find answer in question container - IMPROVED WITH extractFillInAnswer
    function findAnswer(question) {
        let answer = null;
        let type = 'unknown';

        // Method 1: Look for the answer box
        const answerBoxSelectors = [
            '.forfeit-answer:first',
            '.forfeit-content:first', 
            '.correct-answer:first',
            '.solution-content:first',
            '.answer-key:first'
        ];

        for (let selector of answerBoxSelectors) {
            const answerBox = question.find(selector).first();
            
            if (answerBox.length && answerBox.is(':visible')) {
                console.log(`🔎 Found answer box with selector: ${selector}`);
                
                // USE extractFillInAnswer untuk extract dengan benar
                answer = extractFillInAnswer(answerBox);
                
                if (answer) {
                    type = 'fill-in';
                    console.log(`✅ Extracted answer: "${answer}"`);
                    break;
                }
            }
        }

        // Method 2: If no answer found, try alternative selectors
        if (!answer) {
            console.log('🔄 Trying alternative method...');
            
            const allAnswerElements = question.find('.forfeit-answer, .correct-answer, .solution-content');
            
            allAnswerElements.each(function() {
                const elem = $(this);
                answer = extractFillInAnswer(elem);
                
                if (answer) {
                    type = 'fill-in';
                    console.log(`✅ Found answer via alternative: "${answer}"`);
                    return false; // break
                }
            });
        }

        // Clean up answer (only if not enum - preserve enum formatting)
        if (answer && !answer.match(/enum\s+\w+/)) {
            answer = cleanAnswer(answer);
        }
        
        if (answer && type === 'unknown') {
            type = determineAnswerType(question, answer);
        }

        return answer ? { answer, type } : null;
    }

    // Extract multiple choice answer - IMPROVED
    function extractMultipleChoiceAnswer(section) {
        // Look for checked radio button or checkbox
        const checkedInput = section.find('input[type="radio"]:checked, input[type="checkbox"]:checked');
        if (checkedInput.length > 0) {
            const label = section.find(`label[for="${checkedInput.attr('id')}"]`).first();
            if (label.length) {
                return label.text().trim();
            }
        }

        // Look for text that indicates the correct answer
        const text = section.text().trim();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        for (let line of lines) {
            // Skip meta lines
            if (line.toLowerCase() === 'answer' || 
                line.toLowerCase() === 'show answer' ||
                line.toLowerCase().includes('correct answer')) {
                continue;
            }
            
            // Match patterns like: "A) Option", "A. Option"
            const mcMatch = line.match(/^([A-Da-d])[).]\s*(.+)/);
            if (mcMatch && mcMatch[2]) {
                return mcMatch[2].trim();
            }
            
            // If we have a substantial line that's not meta text, use it
            if (line.length > 3 && !isMetaText(line)) {
                return line;
            }
        }

        return null;
    }

    // Extract fill-in answer - IMPROVED WITH ENUM SUPPORT
    function extractFillInAnswer(element) {
        const text = element.text().trim();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        console.log(`🔍 Extracting from ${lines.length} lines`);
        
        // FIRST: Check for code blocks (highest priority for enum)
        const codeBlocks = element.find('code, pre, .code, .forfeit-code, samp, .zb-code');
        if (codeBlocks.length > 0) {
            const code = codeBlocks.first().text().trim();
            if (code && code.length > 0 && !isMetaText(code)) {
                console.log(`   ✅ Found code block: "${code}"`);
                return code;
            }
        }
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            console.log(`   Line ${i}: "${line}"`);
            
            // Skip meta text lines
            if (isMetaText(line)) {
                console.log(`   ⏭️  Skipped meta text`);
                continue;
            }
            
            // CHECK: Is this a simple number? (for integer value questions)
            if (/^\d+$/.test(line)) {
                console.log(`   ✅ Found number: "${line}"`);
                return line;
            }
            
            // CHECK: Is this an enum declaration?
            if (line.match(/enum\s+\w+\s*\{[^}]*\}\s*;?/)) {
                console.log(`   ✅ Found enum declaration: "${line}"`);
                return line.endsWith(';') ? line : line + ';';
            }
            
            // CHECK: Is this an enum variable declaration?
            if (line.match(/^enum\s+\w+\s+\w+\s*;?$/)) {
                console.log(`   ✅ Found enum variable: "${line}"`);
                return line.endsWith(';') ? line : line + ';';
            }
            
            // CHECK: Is this an assignment?
            if (line.match(/^\w+\s*=\s*\w+\s*;?$/)) {
                console.log(`   ✅ Found assignment: "${line}"`);
                return line.endsWith(';') ? line : line + ';';
            }
            
            // Skip long explanatory lines (likely not the answer itself)
            if (line.length > 100) {
                console.log(`   ⏭️  Skipped long explanation`);
                continue;
            }
            
            // Skip lines that look like explanations
            if (isExplanationText(line)) {
                console.log(`   ⏭️  Skipped explanation line`);
                continue;
            }
            
            // Remove common prefixes
            line = line.replace(/^(answer|solution|correct answer):?\s*/i, '').trim();
            
            // Prefer short, concise answers (likely the actual answer)
            if (line.length > 0 && line.length < 50 && !isMetaText(line)) {
                // Check if it's just a number or simple text
                if (/^[\d\w\s\-\.,:;]+$/.test(line)) {
                    console.log(`   ✅ Selected: "${line}"`);
                    return line;
                }
            }
        }
        
        // Fallback: look for the first short line that's not meta
        for (let line of lines) {
            if (!isMetaText(line) && line.length > 0 && line.length < 50) {
                const cleaned = line.replace(/^(answer|solution|correct answer):?\s*/i, '').trim();
                if (cleaned.length > 0) {
                    console.log(`   ✅ Fallback selected: "${cleaned}"`);
                    return cleaned;
                }
            }
        }
        
        // LAST RESORT: Extract number from explanation like "FURNACE_ON is 2"
        const numberInExplanation = text.match(/(\w+)\s+is\s+(\d+)/);
        if (numberInExplanation) {
            const num = numberInExplanation[2];
            console.log(`   ✅ Extracted number from explanation: "${num}"`);
            return num;
        }
        
        return null;
    }

    // Determine answer type
    function determineAnswerType(question, answer) {
        if (question.find('input[type="radio"], input[type="checkbox"]').length > 0) {
            return 'multiple-choice';
        }
        
        if (answer.length === 1 && /[A-Da-d]/.test(answer)) {
            return 'multiple-choice';
        }
        
        if (question.find('textarea, input[type="text"], input[type="number"]').length > 0) {
            return 'fill-in';
        }
        
        return 'fill-in';
    }

    // Fill answer based on type
    function fillAnswerBasedOnType(question, answerInfo) {
        const { answer, type } = answerInfo;
        
        switch(type) {
            case 'multiple-choice':
                return fillMultipleChoiceAnswer(question, answer);
            case 'fill-in':
                return fillTextAnswer(question, answer);
            default:
                console.log(`❓ Unknown answer type: ${type}`);
                return false;
        }
    }

    // Fill multiple choice answer
    function fillMultipleChoiceAnswer(question, answer) {
        console.log(`🎯 Filling multiple choice: "${answer}"`);
        
        const options = question.find('label, .choice-text, .option-text').filter(function() {
            const text = $(this).text().trim().toLowerCase();
            const answerLower = answer.toLowerCase();
            
            return text === answerLower || 
                   text.includes(answerLower) || 
                   answerLower.includes(text);
        });
        
        if (options.length > 0) {
            const option = options.first();
            const input = option.find('input').first();
            
            if (input.length) {
                input.prop('checked', true);
                input.trigger('click');
                input.trigger('change');
                console.log(`✅ Selected: "${option.text().trim()}"`);
                return true;
            } else {
                option[0].click();
                console.log(`✅ Clicked: "${option.text().trim()}"`);
                return true;
            }
        }
        
        console.log('❌ Could not find matching option');
        return false;
    }

    // Fill text answer - RELIABLE MODE
    function fillTextAnswer(question, answer) {
        const inputField = findInputField(question);
        if (!inputField.length) return false;
        
        try {
            if (inputField.is('input, textarea')) {
                const element = inputField[0];
                
                // Focus first to activate the field
                inputField.focus();
                element.focus();
                
                // Set value with multiple methods for reliability
                element.value = answer;
                inputField.val(answer);
                
                // Use native setter for React compatibility
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    window.HTMLInputElement.prototype, 
                    'value'
                )?.set;
                
                if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(element, answer);
                }
                
                // Trigger comprehensive events
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
                
                // jQuery triggers as backup
                inputField.trigger('input');
                inputField.trigger('change');
                inputField.trigger('blur');
                
                console.log(`✅ Filled: "${answer}"`);
                return true;
            } 
            else if (inputField.attr('contenteditable') === 'true') {
                inputField.text(answer);
                inputField.trigger('input');
                inputField.trigger('change');
                return true;
            }
            else if (inputField.hasClass('CodeMirror')) {
                const cm = inputField[0].CodeMirror;
                if (cm) {
                    cm.setValue(answer);
                    cm.refresh();
                }
                return true;
            }
            return false;
        } catch (error) {
            console.log(`❌ Error: ${error}`);
            return false;
        }
    }

    // Find input field
    function findInputField(question) {
        const selectors = [
            'textarea:visible',
            'input[type="text"]:visible',
            'input[type="number"]:visible',
            '.short-answer-input:visible',
            '.zb-text-area:visible',
            'div[contenteditable="true"]:visible',
            '.CodeMirror:visible'
        ];
        
        for (let selector of selectors) {
            const input = question.find(selector).first();
            if (input.length) {
                return input;
            }
        }
        
        return $();
    }

    // Click submit/check button - RELIABLE
    function clickSubmitButton(question, index) {
        const buttons = question.find('button').filter(function() {
            const text = $(this).text().trim().toLowerCase();
            return (text === 'check' || text === 'submit') && $(this).is(':visible');
        });
        
        if (buttons.length > 0 && !buttons.first().hasClass('auto-clicked')) {
            setTimeout(() => {
                console.log(`🚀 Submitting...`);
                buttons.first()[0].click();
                buttons.first().addClass('auto-clicked');
            }, 150);
            return true;
        }
        return false;
    }

    // Helper functions
    function cleanAnswer(answer) {
        return answer
            .replace(/^(answer|solution|correct answer):?\s*/i, '')
            .replace(/^\d+[.)]\s*/, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function isMetaText(text) {
        const metaWords = ['show answer', 'correct answer', 'solution', 'check', 'submit', 'next', 'question', 'press again'];
        const lowerText = text.toLowerCase();
        // Check if the entire text is just a meta word, or if it starts with "Answer" as a label
        return metaWords.some(word => lowerText === word) || 
               (lowerText === 'answer' && text.length < 10);
    }

    function isExplanationText(text) {
        const explanationKeywords = [
            'loop', 'body', 'execute', 'time', 'gotten', 'initialized',
            'will be', 'as follows', 'true', 'false', 'because', 'thus',
            'first', 'second', 'third', 'input', 'relevant', 'additional',
            'declares', 'assigned', 'integer value', 'named values', 'within'
        ];
        const lowerText = text.toLowerCase();
        
        // Check for explanation keywords
        if (explanationKeywords.some(word => lowerText.includes(word))) {
            return true;
        }
        
        // Check for "X is Y" pattern which indicates explanation
        // BUT make sure we're not rejecting single numbers
        if (lowerText.match(/\w+\s+is\s+\d+/) && text.length > 15) {
            return true;
        }
        
        return false;
    }

    function getElementUniqueId(element) {
        if (!element) return 'null';
        const rect = element.getBoundingClientRect();
        return `${element.tagName}_${rect.top}_${rect.left}_${element.className}`.replace(/\s+/g, '_');
    }

    // Start the process
    if (AUTO_RUN) {
        setTimeout(runAutoComplete, 3000);
        
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(runAutoComplete, 2000);
            }
        }, 1000);
    }

    // Manual controls
    window.zyAuto = {
        run: runAutoComplete,
        reset: function() {
            processedElements.clear();
            isRunning = false;
            $('.auto-processed, .auto-clicked').removeClass('auto-processed auto-clicked');
            console.log('✅ Reset completed');
        },
        debug: function() {
            const questions = $('.question-set-question, .zb-activity').filter(':visible');
            console.log(`Found ${questions.length} questions`);
            questions.each(function(i) {
                console.log(`\nQuestion ${i + 1}:`);
                const answer = findAnswer($(this));
                console.log('Answer:', answer);
            });
        }
    };

    console.log('✅ zyBooks Autocomplete Enhanced ready!');
    console.log('Commands: zyAuto.run(), zyAuto.reset(), zyAuto.debug()');
})();
