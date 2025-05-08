// Variables globales

let conversationHistory = [];
let conversations = [];
let currentConversationId = null;
let isGenerating = false;
let serverUrl = 'http://192.168.1.100:1234';
let isConnected = false;

// Configuration de marked
marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: true,
    mangle: false,
    sanitize: false,
    highlight: function(code, lang) {
        return code;
    }
});

function uniqid(prefix=""){ return prefix+Math.random().toString(36).substr(2); }

function indexOfConversationMessage(id){
    for(let i=0;i<conversationHistory.length;i++){
        let msg = conversationHistory[i];
        if( (msg.id??null) === id ) return i;
    }
    return -1;
}
function findConversationMessage(id){
	for(let msg of conversationHistory){
		if( (msg.id??null) === id ) return msg;
	}
	return null;
}
function alterConversationMessage(id,text){
	let msg = findConversationMessage(id);
	if(msg===null) return;
	msg.content = text;
    saveCurrentConversation();
}
function deleteConversationMessage(id){
    let idx = indexOfConversationMessage(id);
    console.log("removing",id,idx,conversationHistory);
    let msg =conversationHistory.splice(idx,1);
    console.log("removing2",id,idx,conversationHistory);
    saveCurrentConversation();
    console.log("removing3",id,idx,conversationHistory);
    return msg;
}


function loadFromLocalStorage() {
    const savedConversations = localStorage.getItem('conversations');
    if (savedConversations) {
        conversations = JSON.parse(savedConversations);
        // Si des conversations existent, définir la dernière comme conversation courante
        if (conversations.length > 0) {
            currentConversationId = conversations[conversations.length - 1].id;
        }
    } else {
        conversations = [];
    }

    const savedServerUrl = localStorage.getItem('serverUrl');
    if (savedServerUrl) {
        serverUrl = savedServerUrl;
        document.getElementById('serverUrl').value = serverUrl;
    }
}

function saveToLocalStorage() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
    localStorage.setItem('serverUrl', serverUrl);
}

function renderConversations() {
    const conversationsContainer = document.getElementById('conversations');
    conversationsContainer.innerHTML = '';

    conversations.forEach(conv => {
        const convDiv = document.createElement('div');
        convDiv.className = 'conversation-item';
        if (conv.id === currentConversationId) {
            convDiv.classList.add('active');
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'conversation-title';
        titleSpan.textContent = conv.title || `Conversation on ${new Date(conv.date).toLocaleString()}`;
        titleSpan.onclick = () => loadConversation(conv.id);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'conversation-actions';

        const renameButton = document.createElement('button');
        renameButton.className = 'action-button';
        renameButton.textContent = 'Rename';
        renameButton.onclick = (e) => {
            e.stopPropagation();
            renameConversation(conv.id);
        };

        const deleteButton = document.createElement('button');
        deleteButton.className = 'action-button';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deleteConversation(conv.id);
        };

        actionsDiv.appendChild(renameButton);
        actionsDiv.appendChild(deleteButton);

        convDiv.appendChild(titleSpan);
        convDiv.appendChild(actionsDiv);
        conversationsContainer.appendChild(convDiv);
    });
}

function startNewConversation() {
    currentConversationId = 'conv_' + Date.now();
    conversationHistory = [];
    document.getElementById('chatHistory').innerHTML = '';
    conversations.push({
        id: currentConversationId,
        date: Date.now(),
        messages: [],
        title: 'New conversation'
    });
    saveToLocalStorage();
    renderConversations();
    enableInput();
    updateCurrentConversationTitle();
}

function loadConversation(convId) {
    const conversation = conversations.find(c => c.id === convId);
    if (conversation) {
        currentConversationId = convId;
        conversationHistory = conversation.messages;
        document.getElementById('chatHistory').innerHTML = '';
        conversation.messages.forEach(msg => {
            addMessageToHistory(msg.content, msg.role, msg.id??null);
        });
        renderConversations();
        enableInput();
        updateCurrentConversationTitle();
    }
}

function updateCurrentConversationTitle() {
    const titleBar = document.getElementById('currentConversationTitle');
    const currentConversation = conversations.find(c => c.id === currentConversationId);
    if (currentConversation) {
        titleBar.textContent = currentConversation.title || `Conversation on ${new Date(currentConversation.date).toLocaleString()}`;
    } else {
        titleBar.textContent = 'New conversation';
    }
}

function saveCurrentConversation() {
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages = conversationHistory;
        if (!conversation.title && conversationHistory.length > 0) {
            conversation.title = conversationHistory[0].content.substring(0, 30) + '...';
        }
        saveToLocalStorage();
        renderConversations();
        updateCurrentConversationTitle();
    }
}

function renameConversation(convId) {
    const conversation = conversations.find(c => c.id === convId);
    if (conversation) {
        const newTitle = prompt("Enter a new title for the conversation:", conversation.title);
        if (newTitle !== null && newTitle.trim() !== "") {
            conversation.title = newTitle.trim();
            saveToLocalStorage();
            renderConversations();
            if (convId === currentConversationId) {
                updateCurrentConversationTitle();
            }
        }
    }
}

function deleteConversation(convId) {
    if (confirm("Do you really want to delete ?")) {
        const index = conversations.findIndex(c => c.id === convId);
        if (index > -1) {
            conversations.splice(index, 1);
            saveToLocalStorage();
            if (convId === currentConversationId) {
                if (conversations.length > 0) {
                    // Charge la dernière conversation si elle existe
                    loadConversation(conversations[conversations.length - 1].id);
                } else {
                    currentConversationId = null;
                    conversationHistory = [];
                    document.getElementById('chatHistory').innerHTML = '';
                    startNewConversation();
                }
            }
            renderConversations();
        }
    }
}

function disableInput() {
    isGenerating = true;
    document.getElementById('chatInput').disabled = true;
    document.getElementById('sendButton').disabled = true;
    document.getElementById('newConversationButton').disabled = true;
}

function enableInput() {
    isGenerating = false;
    document.getElementById('chatInput').disabled = false;
    document.getElementById('sendButton').disabled = false;
    document.getElementById('newConversationButton').disabled = false;
}


function onEditMessageFromHistory(messageDiv,role,id){
	alterConversationMessage(id,messageDiv.textContent);
}


function addMessageToHistory(message, role, id=null,image_data=null) {
    const chatHistory = document.getElementById('chatHistory');
    const messageContainerDiv = document.createElement('div');
    messageContainerDiv.className = `message ${role}-message`;
    const messageDiv = document.createElement('div');
    messageDiv.className = `inner-message inner-${role}-message`;

    id=id ?? uniqid("msg_");
	messageDiv.id = id;
	
	messageDiv.contentEditable=true;
	messageDiv.oninput=function(){ onEditMessageFromHistory(messageDiv,role,id) }
    
    if (role === 'assistant') {
        const markdownContent = document.createElement('div');

        markdownContent.className = 'markdown-content';
        const htmlContent = marked.parse(message);
        markdownContent.innerHTML = htmlContent;
        messageDiv.appendChild(markdownContent);
    } else {
        messageDiv.textContent = message;
    }

    const messageControlsDiv = document.createElement('div');
    const regenerateButton = document.createElement('button');
    const deleteButton = document.createElement('button');
    regenerateButton.innerHTML='&#10227;';
    deleteButton.innerHTML='&#128465;';
    regenerateButton.className='send-button tiny-button'
    deleteButton.className='reset-button tiny-button'
    messageControlsDiv.className='message-controls'
    function removeThisMessage(){
        messageContainerDiv.remove();
        deleteConversationMessage(id);
    }
    deleteButton.onclick=removeThisMessage;
    regenerateButton.onclick=async()=>{
        removeThisMessage();
        generateResponseMessage();
    }
    messageControlsDiv.appendChild(regenerateButton);
    messageControlsDiv.appendChild(deleteButton);


    messageContainerDiv.appendChild(messageControlsDiv);
    messageContainerDiv.appendChild(messageDiv);


    if(image_data){
        console.log("add-msg-img-data",image_data);
        let datauri = "data:image/png;base64,"+image_data;
        let img = document.createElement('img');
        img.src = datauri;
        img.width=480;
        messageContainerDiv.appendChild(img);
    }

    chatHistory.appendChild(messageContainerDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function showTypingIndicator() {
    const chatHistory = document.getElementById('chatHistory');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'typing-dot';
        typingDiv.appendChild(dot);
    }
    chatHistory.appendChild(typingDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function generateResponseMessage(generateImage=false){
    if(isGenerating) return;
    if(conversationHistory.length===0){
        alert("You cannot generate a response with no message history.\r\nAdding a message and try again.")
        return;
    }

    let lastMessage=conversationHistory[conversationHistory.length-1];
    lastMessage.content+=" ";//hack to prevent the AI from having a blank reply to itself (stop message)


    disableInput();
    showTypingIndicator();
    try {
        const data = await LMStudioAPI.getReply(conversationHistory,generateImage);
        console.log("RESP-DATA",data)
        removeTypingIndicator();
        const message = data.choices[0].message;
        let content = message.content ?? null;
        let imagedata=null;

        //LLM requested to call a tool.
        if(message.tool_calls && Array.isArray(message.tool_calls)){
            let call = message.tool_calls[0];
            let func = call.function;
            switch(func.name){
                case "show_image":
                    let args = JSON.parse(func.arguments);
                    console.log("show-image-args",args);
                    imagedata = await AutomaticAPI.getImage(args.desc,args.tags,args.style);
                    if(imagedata.images && Array.isArray(imagedata.images)){
                        imagedata=imagedata.images[0];
                    }
            }
        }

        //the LLM tends to sometimes respond with JSON instead of just calling the tool - so we can extract the JSON.
        if(!message.tool_calls && (content || (data.choices[0].finish_reason!=="stop"))){
            content = content ?? "";
            let rgx = /({.+})/g;
            let arr = rgx.exec(content);
            let json = (arr && Array.isArray(arr) && arr.length>1) ? arr[1] : null;
            if(json){
                let args=null;
                try{
                    args = JSON.parse(json);
                }catch (ex){
                    args = JSON.parse(json.replaceAll("\\'","'"));
                }
                if(args.parameters) args=args.parameters;

                console.log("show-image-args2",args);
                imagedata = await AutomaticAPI.getImage(args.desc,args.tags,args.style);
                if(imagedata.images && Array.isArray(imagedata.images)){
                    imagedata=imagedata.images[0];
                }
            }
        }

        //process chat content
        if(content || (data.choices[0].finish_reason!=="stop")){
            content = content ?? "";
            const assistantMessage = {
                role: "assistant",
                content: content,
                id: uniqid("msg_"),
            };
            conversationHistory.push(assistantMessage);
            addMessageToHistory(content, 'assistant', assistantMessage.id, imagedata);
        }
        saveCurrentConversation();
        updateConnectionStatus(true);
    } catch (error) {
        removeTypingIndicator();
        addMessageToHistory(`Error: ${error.message}`, 'assistant');
        updateConnectionStatus(false);
    }
    enableInput();
}

async function sendChatMessageInternal(message, role="user", generateResponse=true,generateImage=false) {
    if (!message || isGenerating) return;
    const userMessage = {
        role: role,
        content: message,
		id: uniqid("msg_"),
    };
    addMessageToHistory(message, role, userMessage.id);
    conversationHistory.push(userMessage);
    saveCurrentConversation();
    if(generateResponse) await generateResponseMessage(generateImage);
}

async function sendChatMessage(){
    const message = document.getElementById('chatInput').value.trim();
    const role = document.getElementById('author')?.value ?? "user";
    const generateResponse = document.getElementById('generateResponseCheckbox')?.checked ?? true;
    const generateImage = document.getElementById('generateImageCheckbox')?.checked ?? false;
    document.getElementById('chatInput').value = '';
    if(!message){
        generateResponseMessage(generateImage)
    }else{
        await sendChatMessageInternal(message,role,generateResponse,generateImage);
    }
}

async function checkConnection() {
    try {
        const connected = await LMStudioAPI.checkConnection();
        updateConnectionStatus(connected);
    } catch (error) {
        updateConnectionStatus(false);
    }
}

function updateConnectionStatus(connected) {
    const statusIndicator = document.getElementById('connectionStatus');
    isConnected = connected;
    if (connected) {
        statusIndicator.className = 'connected';
        statusIndicator.title = 'Connected';
        enableInput();
    } else {
        statusIndicator.className = 'disconnected';
        statusIndicator.title = 'Disconnected';
        disableInput();
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    renderConversations();
    
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendButton');
    const newConversationButton = document.getElementById('newConversationButton');
    const serverUrlInput = document.getElementById('serverUrl');

    chatInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
            e.preventDefault();
            sendChatMessage();
        }
    });

    sendButton.addEventListener('click', sendChatMessage);
    newConversationButton.addEventListener('click', startNewConversation);
    
    serverUrlInput.addEventListener('change', function() {
        serverUrl = this.value;
        saveToLocalStorage();
        checkConnection();
    });

    // Nouvelle logique d'initialisation
    if (conversations.length > 0) {
        // Charge la dernière conversation si elle existe
        const lastConversation = conversations[conversations.length - 1];
        loadConversation(lastConversation.id);
    } else {
        // Crée une nouvelle conversation uniquement si aucune n'existe
        startNewConversation();
    }

    checkConnection();
    setInterval(checkConnection, 5000);
});
