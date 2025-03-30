class ChatCompletionRequestBody{
    messages= [];
    model= "local-model";
    temperature= 0.7;

    tools=[
        {
            type:"function",
            function:{
                name:"show_image",
                description:"Shows the user the current scene.",
                parameters:{
                    type:"object",
                    properties:{
                        /*tags:{
                            type:"string",
                            description: "A comma-separated list of tags or keywords that describe the image, as if it was on an imageboard."
                        },*/
                        desc:{
                            type:"string",
                            description: "A description of the scene including all visual details to show"
                        },
                        /*style:{
                            type:"string",
                            description: "The style of the image to show. Casual photo should usually be used for realistic images.",
                            enum: ["casual photo", "cinematic photo", "digital art", "anime"]
                        }*/
                    },
                    required: ["desc"]
                }
            }
        }
    ]

    constructor(messages,temperature=0.7,useTools=false) {
        this.messages=messages;
        this.temperature=temperature;
        if(!useTools) this.tools=undefined;
    }
}
class ChatCompletionRequest{
    requestURL="";
    payload = null;
    //useTools=false;
    constructor(serverUrl,messages,temperature=0.7,useTools=false) {
        this.requestURL=`${serverUrl}/v1/chat/completions`;
        this.payload = new ChatCompletionRequestBody(messages,temperature,useTools);
        //this.useTools = useTools;
    }
    async post(){
        let response = await fetch(this.requestURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            //mode: 'no-cors',
            body: JSON.stringify(this.payload)
        });
        return await response.json();
    }
    static async post(serverUrl,messages,temperature=0.7,useTools=false){
        return await (new ChatCompletionRequest(serverUrl,messages,temperature,useTools)).post();
    }
}


class LMStudioAPI {
    static URL='http://192.168.1.100:1234';
    static async getReply(conversationHistory,useTools=false){
        return await ChatCompletionRequest.post(LMStudioAPI.URL,conversationHistory,0.7,useTools);
    }
}