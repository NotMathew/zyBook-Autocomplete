// ==UserScript==
// @name         zyBooks Autocomplete
// @version      0.5
// @description  Autocomplete for zyBooks with Animation Support and 2x Speed
// @author       NotMathew
// @match        https://learn.zybooks.com/zybook/*
// @namespace    https://github.com/NotMathew/zyBook-Autocomplete
// @run-at       document-idle
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('zyBooks Autocomplete v0.5 loaded');

    // Settings
    const AUTO_RUN = true;
    const DELAY_AFTER_SHOW_ANSWER = 1000; // Increased to give more time for answer to appear
    const DELAY_BETWEEN_QUESTIONS = 300;
    const CLICK_DELAY = 100;
    const SUBMIT_DELAY = 250;
    const RETRY_DELAY = 500;
    const ANIMATION_CHECK_INTERVAL = 500;

    let isRunning = false;
    let processedElements = new Set();
    const processedAnimationControls = new WeakSet();
    const lastClickedSteps = new WeakMap();

    // Main function
    function runAutoComplete() {
        if (isRunning) return;
        isRunning = true;

        console.log('🚀 Starting zyBooks autocomplete...');

        handleAnimations();
        clickShowAnswerButtons();

        setTimeout(() => {
            fillAllAnswers();
            isRunning = false;
        }, DELAY_AFTER_SHOW_ANSWER);
    }

    // ==========================================
    // ANIMATION HANDLING
    // ==========================================
    
    function enable2xSpeed(animationControl) {
        const speedCheckbox = animationControl.querySelector('.speed-control input[type="checkbox"]');
        if (speedCheckbox && !speedCheckbox.checked) {
            console.log('⚡ Enabling 2x speed');
            speedCheckbox.click();
            return true;
        }
        return false;
    }

    function getCurrentStepNumber(animationControl) {
        const highlighted = animationControl.querySelector('button.step.step-highlight');
        if (highlighted) {
            const stepText = highlighted.querySelector('.title')?.textContent;
            return parseInt(stepText) || 0;
        }
        return 0;
    }

    function clickNextStep(animationControl) {
        const stepButtons = Array.from(animationControl.querySelectorAll('button.step'));
        const currentStep = getCurrentStepNumber(animationControl);
        const lastClicked = lastClickedSteps.get(animationControl) || 0;

        for (const button of stepButtons) {
            const stepText = button.querySelector('.title')?.textContent;
            const stepNumber = parseInt(stepText) || 0;
            const isDisabled = button.classList.contains('disabled');
            const isHighlighted = button.classList.contains('step-highlight');

            if (!isDisabled && !isHighlighted && stepNumber > currentStep && stepNumber > lastClicked) {
                console.log(`⏩ Clicking step ${stepNumber}`);
                button.click();
                lastClickedSteps.set(animationControl, stepNumber);
                return true;
            }
        }
        return false;
    }

    function processAnimationControl(animationControl) {
        if (processedAnimationControls.has(animationControl)) {
            return;
        }
        processedAnimationControls.add(animationControl);

        const observer = new MutationObserver(() => {
            enable2xSpeed(animationControl);
            clickNextStep(animationControl);
        });

        observer.observe(animationControl, {
            attributes: true,
            childList: true,
            subtree: true
        });

        enable2xSpeed(animationControl);
        clickNextStep(animationControl);
    }

    function findAndProcessAllAnimationControls() {
        const allControls = document.querySelectorAll('.animation-controls');
        allControls.forEach(control => {
            enable2xSpeed(control);
            clickNextStep(control);
            processAnimationControl(control);
        });
    }

    function handleAnimations() {
        console.log('🎬 Checking for animations...');
        
        findAndProcessAllAnimationControls();
        
        const animationContainers = document.querySelectorAll(
            '.interactive-activity-container.animation-player-content-resource.participation, ' +
            '.animation-player-content-resource'
        );
        
        animationContainers.forEach(container => {
            const chevron = container.querySelector('.zb-chevron');
            if (chevron && chevron.classList.contains('filled')) {
                return;
            }
            
            const controls = container.querySelectorAll('.animation-controls');
            controls.forEach(control => {
                enable2xSpeed(control);
                clickNextStep(control);
                processAnimationControl(control);
            });
            
            processAnimationContainer(container);
        });
        
        handleStandalonePlayButtons();
    }
    
    function processAnimationContainer(container) {
        const startButtons = container.querySelectorAll('.start-button, .zb-button.start-graphic');
        startButtons.forEach(btn => {
            const btnText = btn.textContent.trim();
            if (btnText === 'Start' || btnText.toLowerCase().includes('start')) {
                btn.click();
            }
        });
        
        clickPlayButton(container);
        handlePauseInteractions(container);
    }
    
    function clickPlayButton(container) {
        const playByAria = container.querySelectorAll('[aria-label="Play"]');
        playByAria.forEach(btn => {
            const iconElement = btn.querySelector('svg, .zyante-icon, [class*="icon"]');
            if (!iconElement || !iconElement.classList.contains('rotate-180')) {
                btn.click();
            }
        });
    }
    
    function handlePauseInteractions(container) {
        const pauseButtons = container.querySelectorAll('.play-button.bounce, .continue-button, .resume-button');
        pauseButtons.forEach(btn => btn.click());
        
        const forwardButtons = container.querySelectorAll('.forward-button, .step-forward, .next-step');
        forwardButtons.forEach(btn => {
            if (!btn.disabled) btn.click();
        });
    }
    
    function handleStandalonePlayButtons() {
        const allPlayButtons = document.querySelectorAll('[aria-label="Play"]');
        
        allPlayButtons.forEach(btn => {
            const parent = btn.closest('.interactive-activity-container, .participation');
            if (parent) {
                const chevron = parent.querySelector('.zb-chevron');
                if (chevron && chevron.classList.contains('filled')) return;
            }
            
            const iconElement = btn.querySelector('svg, [class*="icon"]');
            if (!iconElement || !iconElement.classList.contains('rotate-180')) {
                btn.click();
            }
        });
        
        document.querySelectorAll('.speed-control input[type="checkbox"]').forEach(checkbox => {
            if (!checkbox.checked) checkbox.click();
        });
        
        document.querySelectorAll('.title').forEach(el => {
            if (el.textContent.trim() === 'Start') el.click();
        });
    }

    // Click Show Answer buttons
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

            setTimeout(() => {
                btn[0].click();
                setTimeout(() => {
                    btn[0].click();
                    btn.addClass('auto-processed');
                    processedElements.add(elementId + '-double-clicked');
                }, 150);
            }, index * CLICK_DELAY);
        });
    }

    // Fill answers into input fields
    function fillAllAnswers() {
        console.log('🔍 Looking for answers to fill...');

        const questions = $('.question-set-question, .short-answer-question').filter(':visible');

        console.log(`📋 Found ${questions.length} questions`);

        questions.each(function(index) {
            const question = $(this);
            const elementId = getElementUniqueId(question[0]);
            
            if (processedElements.has(elementId + '-filled')) {
                return;
            }

            setTimeout(() => {
                processQuestion(question, index);
                processedElements.add(elementId + '-filled');
            }, index * DELAY_BETWEEN_QUESTIONS);
        });
    }

    // Process a single question
    function processQuestion(question, index) {
        console.log(`\n📌 Processing question ${index + 1}`);

        // Check if already correct
        if (question.find('.zb-explanation.correct').length > 0) {
            console.log(`✅ Question ${index + 1} already correct, skipping`);
            return;
        }

        const hasRadioButtons = question.find('input[type="radio"]').length > 0;
        const hasCheckboxes = question.find('input[type="checkbox"]').length > 0;
        const hasTextInput = question.find('input[type="text"], textarea').length > 0;

        if (hasRadioButtons || hasCheckboxes) {
            console.log(`🎯 Multiple choice question detected`);
            handleMultipleChoice(question, index);
        } else if (hasTextInput) {
            console.log(`✍️  Text input question detected`);
            handleTextInput(question, index);
        }
    }

    // Handle multiple choice questions
    function handleMultipleChoice(question, index) {
        const choices = question.find('label, .choice, .option, [role="radio"]').filter(':visible');
        
        if (choices.length === 0) {
            handleMultipleChoiceByInput(question, index);
            return;
        }

        let currentChoiceIndex = 0;
        let attempts = 0;
        const maxAttempts = choices.length * 2;

        function tryNextChoice() {
            attempts++;
            if (attempts > maxAttempts) return;

            const isCorrect = question.find('.zb-explanation.correct').length > 0;
            if (isCorrect) {
                console.log(`✅ Question ${index + 1} correct!`);
                return;
            }

            if (currentChoiceIndex >= choices.length) return;

            const choice = $(choices[currentChoiceIndex]);
            choice[0].click();
            
            const input = choice.find('input[type="radio"], input[type="checkbox"]').first();
            if (input.length) {
                input.prop('checked', true);
                input[0].click();
            }

            setTimeout(() => {
                const checkBtn = question.find('button').filter(function() {
                    const text = $(this).text().trim().toLowerCase();
                    return (text === 'check' || text === 'submit') && $(this).is(':visible');
                }).first();

                if (checkBtn.length) {
                    checkBtn[0].click();

                    setTimeout(() => {
                        const isCorrectNow = question.find('.zb-explanation.correct').length > 0;
                        if (!isCorrectNow) {
                            currentChoiceIndex++;
                            setTimeout(tryNextChoice, 300);
                        }
                    }, RETRY_DELAY);
                } else {
                    currentChoiceIndex++;
                    setTimeout(tryNextChoice, 200);
                }
            }, 300);
        }

        tryNextChoice();
    }

    function handleMultipleChoiceByInput(question, index) {
        const options = question.find('input[type="radio"], input[type="checkbox"]').filter(':visible');
        if (options.length === 0) return;

        let currentOptionIndex = 0;

        function tryNextOption() {
            if (currentOptionIndex >= options.length) return;

            const option = $(options[currentOptionIndex]);
            option.prop('checked', true);
            option[0].click();

            setTimeout(() => {
                const checkBtn = question.find('button:contains("Check"), button:contains("Submit")').filter(':visible').first();
                if (checkBtn.length) {
                    checkBtn[0].click();
                    
                    setTimeout(() => {
                        const isCorrect = question.find('.zb-explanation.correct').length > 0;
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

    // Handle text input questions
    function handleTextInput(question, index) {
        const answer = findAnswer(question);
        
        if (!answer) {
            console.log(`❌ No answer found`);
            return;
        }

        console.log(`💡 Answer: "${answer}"`);

        if (fillTextAnswer(question, answer)) {
            setTimeout(() => clickSubmitButton(question, index), SUBMIT_DELAY);
        }
    }

    // ==========================================
    // ANSWER EXTRACTION - COMPLETELY REWRITTEN
    // ==========================================
    
    function findAnswer(question) {
        console.log('🔎 Searching for answer...');
        
        // METHOD 1: Look for the forfeit-answer element which contains the revealed answer
        // This is the orange/brown box that appears after clicking "Show Answer"
        const forfeitAnswer = question.find('.forfeit-answer').first();
        
        if (forfeitAnswer.length > 0) {
            console.log('   Found .forfeit-answer element');
            
            // The answer is usually in a specific child element
            // Try to find code/pre/samp first (for code answers)
            let answerElement = forfeitAnswer.find('code, pre, samp, .zb-code').first();
            
            if (answerElement.length > 0) {
                const answer = answerElement.text().trim();
                if (answer && answer.length > 0) {
                    console.log(`   ✅ Found answer in code element: "${answer}"`);
                    return answer;
                }
            }
            
            // Otherwise, get the direct text content
            // Clone the element and remove any nested explanation divs
            const clone = forfeitAnswer.clone();
            clone.find('.explanation, .zb-explanation, p').remove();
            
            // Get text from what remains
            const text = clone.text().trim();
            
            if (text) {
                // Split by newlines and get the first non-empty line
                const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                
                for (const line of lines) {
                    // Skip if it's just "Answer" label
                    if (/^answer:?$/i.test(line)) continue;
                    
                    // This should be the actual answer
                    console.log(`   ✅ Found answer: "${line}"`);
                    return line;
                }
            }
            
            // Fallback: just get the first bit of text from forfeit-answer
            const allText = forfeitAnswer.text().trim();
            const match = allText.match(/^(?:Answer:?\s*)?(.+?)(?:\n|$)/i);
            if (match && match[1]) {
                const answer = match[1].trim();
                if (answer && !/^(the |this |a |an )/i.test(answer)) {
                    console.log(`   ✅ Extracted answer: "${answer}"`);
                    return answer;
                }
            }
        }
        
        // METHOD 2: Look for zb-explanation with the answer
        const explanation = question.find('.zb-explanation').first();
        if (explanation.length > 0) {
            console.log('   Found .zb-explanation element');
            
            // Look for "Answer" header followed by the answer
            const html = explanation.html();
            
            // Try to find a pattern like: Answer<br>3.5 or Answer: 3.5
            const answerMatch = html.match(/Answer\s*(?:<[^>]+>)*\s*:?\s*(?:<[^>]+>)*\s*([^<\n]+)/i);
            if (answerMatch && answerMatch[1]) {
                const answer = answerMatch[1].trim();
                if (answer && answer.length < 50 && !/^(the |this |a |an )/i.test(answer.toLowerCase())) {
                    console.log(`   ✅ Found answer from explanation: "${answer}"`);
                    return answer;
                }
            }
            
            // Look for answer box inside explanation
            const answerBox = explanation.find('.forfeit-answer, .answer-box, .answer').first();
            if (answerBox.length > 0) {
                const boxText = answerBox.text().trim();
                if (boxText && boxText.length < 50) {
                    console.log(`   ✅ Found answer in box: "${boxText}"`);
                    return boxText;
                }
            }
        }
        
        // METHOD 3: Look for any element that looks like it contains just an answer
        const possibleAnswerContainers = question.find('[class*="answer"], [class*="solution"], [class*="forfeit"]');
        for (let i = 0; i < possibleAnswerContainers.length; i++) {
            const container = $(possibleAnswerContainers[i]);
            const text = container.text().trim();
            
            // Check if it's a short answer (numbers, short text)
            if (/^-?\d+\.?\d*$/.test(text)) {
                console.log(`   ✅ Found numeric answer: "${text}"`);
                return text;
            }
            
            // Check for answer after "Answer:" label
            const labelMatch = text.match(/Answer:?\s*(.+)/i);
            if (labelMatch && labelMatch[1]) {
                const answer = labelMatch[1].split('\n')[0].trim();
                if (answer.length < 50) {
                    console.log(`   ✅ Found labeled answer: "${answer}"`);
                    return answer;
                }
            }
        }
        
        console.log('   ❌ Could not find answer');
        return null;
    }

    // Fill text answer
    function fillTextAnswer(question, answer) {
        const inputField = question.find('input[type="text"]:visible, textarea:visible, input[type="number"]:visible').first();
        
        if (!inputField.length) {
            console.log('❌ No input field found');
            return false;
        }
        
        try {
            const element = inputField[0];
            
            // Clear existing value first
            element.value = '';
            inputField.val('');
            
            // Set the new value
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
            
            // Trigger all necessary events
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
            element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
            
            inputField.trigger('input');
            inputField.trigger('change');
            inputField.trigger('blur');
            
            console.log(`✅ Filled input with: "${answer}"`);
            return true;
        } catch (error) {
            console.log(`❌ Error filling input: ${error}`);
            return false;
        }
    }

    // Click submit/check button
    function clickSubmitButton(question, index) {
        const buttons = question.find('button').filter(function() {
            const text = $(this).text().trim().toLowerCase();
            return (text === 'check' || text === 'submit') && $(this).is(':visible');
        });
        
        if (buttons.length > 0) {
            console.log(`🚀 Clicking Check button...`);
            buttons.first()[0].click();
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
        
        setInterval(() => {
            handleAnimations();
        }, ANIMATION_CHECK_INTERVAL);
        
        const pageObserver = new MutationObserver(() => {
            findAndProcessAllAnimationControls();
        });
        pageObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                processedElements.clear();
                setTimeout(runAutoComplete, 2000);
            }
        }, 1000);
    }

    // Manual controls
    window.zyAuto = {
        run: runAutoComplete,
        animations: handleAnimations,
        speed: function() {
            document.querySelectorAll('.animation-controls').forEach(control => {
                enable2xSpeed(control);
            });
            document.querySelectorAll('.speed-control input[type="checkbox"]').forEach(checkbox => {
                if (!checkbox.checked) checkbox.click();
            });
            console.log('⚡ Enabled all 2x speed controls');
        },
        reset: function() {
            processedElements.clear();
            isRunning = false;
            $('.auto-processed, .auto-clicked').removeClass('auto-processed auto-clicked');
            console.log('✅ Reset completed');
        },
        // Debug function to see what the script finds
        testAnswer: function() {
            const questions = $('.question-set-question, .short-answer-question').filter(':visible');
            questions.each(function(i) {
                console.log(`\n=== Question ${i + 1} ===`);
                const question = $(this);
                
                // Show forfeit-answer content
                const forfeit = question.find('.forfeit-answer');
                if (forfeit.length) {
                    console.log('Forfeit-answer HTML:', forfeit.html());
                    console.log('Forfeit-answer text:', forfeit.text());
                }
                
                // Show zb-explanation content  
                const explanation = question.find('.zb-explanation');
                if (explanation.length) {
                    console.log('Explanation HTML:', explanation.html());
                }
                
                // Show what findAnswer returns
                const answer = findAnswer(question);
                console.log('Extracted answer:', answer);
            });
        }
    };

    console.log('✅ zyBooks Autocomplete v0.5 ready!');
    console.log('Commands: zyAuto.run(), zyAuto.testAnswer(), zyAuto.speed(), zyAuto.reset()');
})();
