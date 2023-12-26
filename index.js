require("dotenv").config();
const express = require('express');
const app = express();
const PORT = process.env.PORT||5000;
const https = require('https');
const fs = require('fs');
const { GoogleGenerativeAI,HarmCategory,HarmBlockThreshold } = require("@google/generative-ai");
const bodyParser = require("body-parser");
const APIkey = process.env.Geminiapikey;
app.use(express.json());
const path = require('path');


app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));


app.use("/uploads",express.static("uploads"));
const routes=require("./routes");
app.use("/routes",routes);


          
  //                                   // IMAGE INPUT and TEXT INPUT 

  

// Function to read the last uploaded image as base64 format
function getLastUploadedImageAsBase64() {
  const uploadDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(uploadDir);
  const lastImage = files.pop(); // Get the last uploaded image
  const imagePath = path.join(uploadDir, lastImage);
  const fileData = fs.readFileSync(imagePath);
  return fileData.toString('base64');
}

app.post('/generateText', (req, res) => {
  try {
    const { textInput } = req.body;

    if (!textInput) {
      return res.status(400).json({ error: 'Text input is required.' });
    }

    const imageBase64 = getLastUploadedImageAsBase64();

    const requestData = JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              text: textInput,
            },
          ],
        },
      ],
      
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-pro-vision:generateContent?key=${APIkey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const reqToGoogleAPI = https.request(options, (resFromGoogleAPI) => {
      let responseData = '';

      resFromGoogleAPI.on('data', (chunk) => {
        responseData += chunk;
      });

      resFromGoogleAPI.on('end', () => {
        try {
          const responseObj = JSON.parse(responseData);
          if (
            responseObj &&
            responseObj.candidates &&
            responseObj.candidates.length > 0 &&
            responseObj.candidates[0].content &&
            responseObj.candidates[0].content.parts &&
            responseObj.candidates[0].content.parts.length > 0
          ) {
            const generatedText = responseObj.candidates[0].content.parts[0].text;
            console.log('Generated Text:', generatedText);
            res.status(200).json({ generatedText }); // Send the generated text back to the client
          } else {
            console.error('No valid response data found');
            res.status(500).json({ error: 'No valid response data found' });
          }
        } catch (error) {
          console.error('Error parsing response:', error.message);
          res.status(500).json({ error: 'Error parsing response' });
        }
      });
    });

    reqToGoogleAPI.on('error', (error) => {
      console.error('Error:', error.message);
      res.status(500).json({ error: 'Error connecting to Google API' });
    });

    reqToGoogleAPI.write(requestData);
    reqToGoogleAPI.end();
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred while generating text from the image.' });
  }
});
  


                                /////FInal MultiTurn chatting -  TEXT only Input model///////

const genAI = new GoogleGenerativeAI(APIkey);

// Maintain chat history globally
let chatHistory = [];

// Handle the POST request for generating text
app.post('/generatethetext', async (req, res) => {
  try {
    let { history, userInput } = req.body;
    console.log("User input: ",userInput);

    if (!Array.isArray(history)) {
      history = []; // Initialize history if not provided or not an array
    }

    // Set the global chat history to the received history
    chatHistory = history;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Start chat with the updated chat history
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        temperature: 0.7,
        topK: 50,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    });

    // Simulate multi-turn conversation
    const result = await chat.sendMessage(userInput);
    const response = await result.response;
    const text = response.text();
    console.log("model: ",text);

    // Update chat history with the user input and the generated response
    chatHistory.push({ role: 'user', parts: userInput });
    chatHistory.push({ role: 'model', parts: text });

    // Respond with the generated text from the model
    res.json({ generatedText: text, updatedHistory: chatHistory });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'An error occurred while generating text.' });
  }
});




                                  /////FInal TEXT only Input model///////
                                    
  

  // app.post('/generatethetext', (req, res) => {
  //   const { textInput } = req.body; // Assuming the Flutter app sends 'textInput' in the request body
  
  //   const requestData = JSON.stringify({
  //     contents: [
  //       {
  //         parts: [
  //           {
  //             text: textInput,
  //           },
  //         ],
  //       },
  //     ],
  //     generationConfig: {
  //       temperature: 0.9,
  //       topK: 1,
  //       topP: 1,
  //       maxOutputTokens: 2048,
  //       stopSequences: [],
  //     },
  //     safetySettings: [
  //       {
  //         category: 'HARM_CATEGORY_HARASSMENT',
  //         threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  //       },
  //       {
  //         category: 'HARM_CATEGORY_HATE_SPEECH',
  //         threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  //       },
  //       {
  //         category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  //         threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  //       },
  //       {
  //         category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  //         threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  //       },
  //     ],
  //   });
  
  //   const options = {
  //     hostname: 'generativelanguage.googleapis.com',
  //     path: `/v1beta/models/gemini-pro:generateContent?key=${APIkey}`,
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //   };
  
  //   const apiReq = https.request(options, (apiRes) => {
  //     let responseData = '';
  
  //     apiRes.on('data', (chunk) => {
  //       responseData += chunk;
  //     });
  
  //     apiRes.on('end', () => {
  //       try {
  //         const responseObj = JSON.parse(responseData);
  //         if (
  //           responseObj &&
  //           responseObj.candidates &&
  //           responseObj.candidates.length > 0 &&
  //           responseObj.candidates[0].content &&
  //           responseObj.candidates[0].content.parts &&
  //           responseObj.candidates[0].content.parts.length > 0
  //         ) {
  //           const generatedText = responseObj.candidates[0].content.parts[0].text;
  //           res.json({ generatedText });
  //         } else {
  //           res.status(500).json({ error: 'No valid response data found' });
  //         }
  //       } catch (error) {
  //         res.status(500).json({ error: 'Error parsing response' });
  //       }
  //     });
  //   });
  
  //   apiReq.on('error', (error) => {
  //     res.status(500).json({ error: 'API request error' });
  //   });
  
  //   apiReq.write(requestData);
  //   apiReq.end();
  // });
                                   
                                    







    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
                                 
                                  








