document.addEventListener("DOMContentLoaded", () => {
    const chatContainer = document.getElementById('chatbot-container');
    const chatToggle = document.getElementById('chatbot-toggle');
    const chatClose = document.getElementById('chatbot-close');
    const chatMessages = document.getElementById('chatbot-messages');
    const chatInput = document.getElementById('chatbot-input-field');
    const chatSend = document.getElementById('chatbot-send');

    if (!chatToggle) return;

    // --- State & Memory ---
    let chatState = 'intro'; // intro, discovery_type, discovery_budget, discovery_timeline, advice
    let leadData = {
        businessType: '',
        budget: '',
        timeline: '',
        recommendedPlan: ''
    };
    let transcript = [];

    const toggleChat = () => chatContainer.classList.toggle('chatbot-hidden');
    chatToggle.addEventListener('click', toggleChat);
    chatClose.addEventListener('click', toggleChat);

    const appendMessage = (text, sender, isHtml = false) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}-message`;
        if (isHtml) {
            msgDiv.innerHTML = text;
        } else {
            msgDiv.innerText = text;
        }
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        transcript.push({ sender, text });
        window.dispatchEvent(new Event('updateCursor'));
    };

    const showTyping = () => {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const removeTyping = () => {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) typingDiv.remove();
    };

    const addQuickReplies = (options) => {
        const replyDiv = document.createElement('div');
        replyDiv.className = 'quick-replies';
        replyDiv.style.display = 'flex';
        replyDiv.style.gap = '8px';
        replyDiv.style.flexWrap = 'wrap';
        replyDiv.style.marginTop = '10px';

        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'chatbot-btn glass';
            btn.style.padding = '6px 12px';
            btn.style.fontSize = '0.8rem';
            btn.innerText = opt.label;
            btn.onclick = () => {
                replyDiv.remove();
                handleChatAction(opt.value, opt.label);
            };
            replyDiv.appendChild(btn);
        });
        chatMessages.appendChild(replyDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const handleChatAction = (val, label) => {
        appendMessage(label, 'user');
        processLogic(val);
    };

    const processLogic = async (input) => {
        showTyping();
        
        let reply = "";
        let nextQuickReplies = [];

        // --- Sales Funnel State Machine ---
        if (input.toLowerCase().includes('start project') || input === 'action_start') {
            chatState = 'discovery_type';
            reply = "Excellent choice. To give you the best advice, what kind of business are we building for? (e.g., E-commerce, Portfolio, SaaS)";
        } 
        else if (chatState === 'discovery_type') {
            leadData.businessType = input;
            chatState = 'discovery_budget';
            reply = "Got it. And what's your approximate budget range for this transformation?";
            nextQuickReplies = [
                { label: 'Under ₹12k', value: 'Under ₹12k' },
                { label: '₹12k - ₹20k', value: '₹12k - ₹20k' },
                { label: '₹20k+', value: '₹20k+' }
            ];
        }
        else if (chatState === 'discovery_budget') {
            leadData.budget = input;
            chatState = 'discovery_timeline';
            reply = "Noted. Finally, what's your target launch timeline?";
            nextQuickReplies = [
                { label: 'ASAP', value: 'ASAP' },
                { label: '1 Month', value: '1 Month' },
                { label: '2+ Months', value: '2+ Months' }
            ];
        }
        else if (chatState === 'discovery_timeline') {
            leadData.timeline = input;
            chatState = 'advice';
            
            // Logic for Recommendation
            let plan = 'Growth';
            if (input === 'ASAP' || leadData.budget.includes('20k')) plan = 'Premium';
            if (leadData.budget.includes('Under')) plan = 'Basic';
            leadData.recommendedPlan = plan;

            reply = `Based on your needs for a ${leadData.businessType} within ${input}, I highly recommend our **${plan} Plan**. It offers the perfect balance of speed and alchemical precision. Shall I prepare the contact form for you?`;
            nextQuickReplies = [
                { label: 'Yes, Fill Form', value: 'action_fill' },
                { label: 'Tell me more', value: 'action_more' }
            ];
        }
        else if (input === 'action_fill') {
            reply = "I've synchronized your details with the contact form below. Just add your name and email to transmit!";
            autoFillForm();
        }
        else {
            // General AI Query
            try {
                const res = await fetch('http://localhost:5000/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: input, context: leadData })
                });
                const data = await res.json();
                reply = data.reply;
            } catch (err) {
                reply = "The matrix is slightly unstable. Try asking about our pricing or services?";
            }
        }

        setTimeout(() => {
            removeTyping();
            appendMessage(reply, 'bot', true);
            if (nextQuickReplies.length > 0) addQuickReplies(nextQuickReplies);
            saveChatToBackend();
        }, 600);
    };

    const autoFillForm = () => {
        const planSelect = document.getElementById('plan-select');
        const messageArea = document.querySelector('textarea[name="message"]');
        if (planSelect) planSelect.value = leadData.recommendedPlan;
        if (messageArea) {
            messageArea.value = `Business: ${leadData.businessType}\nBudget: ${leadData.budget}\nTimeline: ${leadData.timeline}\nInquiry via AI Assistant.`;
        }
        document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
    };

    const saveChatToBackend = async () => {
        try {
            await fetch('http://localhost:5000/save-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript })
            });
        } catch (err) {}
    };

    const handleChatSubmit = () => {
        const text = chatInput.value.trim();
        if (!text) return;
        appendMessage(text, 'user');
        chatInput.value = '';
        processLogic(text);
    };

    chatSend.addEventListener('click', handleChatSubmit);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatSubmit();
    });

    // Initial Options
    setTimeout(() => {
        addQuickReplies([
            { label: '🚀 Start Project', value: 'action_start' },
            { label: '💰 View Pricing', value: 'Pricing' },
            { label: '🛠️ Our Services', value: 'Services' }
        ]);
    }, 1000);
});
