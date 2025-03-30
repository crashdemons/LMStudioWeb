class AutomaticImageRequestBody{
    prompt="";
    negative_prompt="";
    seed=-1;
    steps= 55
    cfg_scale= 11
    width= 512
    height= 1024

    constructor(desc,tags,style) {
        console.log("Automatic-request-params","desc",desc,"tags",tags,"style",style);
        this.prompt+=desc+","+tags+","+style;
        this.negative_prompt+="disfigured,deformed";
    }

}

class AutomaticImageRequest{
    requestURL="";
    payload = null;
    constructor(serverUrl,desc,tags,style) {
        this.requestURL=`${serverUrl}/sdapi/v1/txt2img`;
        this.payload = new AutomaticImageRequestBody(desc,tags,style);
    }
    async post(){
        console.log("Automatic-post",this.requestURL);
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
    static async post(serverUrl,desc,tags,style){
        return await (new AutomaticImageRequest(serverUrl,desc,tags,style)).post();
    }
}

class AutomaticAPI{
    static URL="http://127.0.0.1:7860";
    static async getImage(desc,tags,style){
        return await AutomaticImageRequest.post(this.URL,desc,tags,style);
    }
}