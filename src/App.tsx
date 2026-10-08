import Markdown from "react-markdown";
import "./App.css";

import { useState, useEffect, useRef } from "react";

import { localPathToBase64 } from "./utils/fileUtils";
import { extractTextFromImage } from "./services/groqService";

import { Table } from "@mantine/core";

import testImage from "./assets/image.png";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";



function App() {
  const fetchedRef = useRef(false);

  const [result, updateResult] = useState('');

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    async function fetchResult() {
      try {

      
        const base64String = await localPathToBase64(testImage);
        const textOutput = await extractTextFromImage(base64String);

        updateResult(textOutput);
    
      } catch (e) {
        console.log(e);
        updateResult("Loading response...");
      }
    }

    fetchResult();
  }, [])

  return (
    <>
      <h1>Evalua</h1>
      <p>The tool for schools across the United States to evaluate international students' transcripts to U.S. schooling system standards.</p>

      <button>Get started </button>

      <form>
        <label className="drop-box" htmlFor="transcript-input">
          Drag and drop your transcript or click to select a file!
        </label>
        <input id="transcript-input" name="transcript-input" type="file" />
      </form>




      {/* <h1>Ai response:</h1>
      <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {result}
      </Markdown> */}
      
    </>
  )
}

export default App;
