import "./App.css";

import { useState, useEffect, useRef } from "react";

import { ArrowRight } from "lucide-react";
import { AppShell, Button, Container, Title, Text, Stack, SimpleGrid, Card, Paper } from "@mantine/core";

function App() {

  return (
    <AppShell>
      <Container size="xl">
        <Stack>
          <Title>Evalua</Title>
          <Text>The tool for schools across the United States to evaluate international students' transcripts to U.S. schooling system standards.</Text>

          <Button>Get started <ArrowRight /></Button>

        <SimpleGrid cols={2}>
          <Card>
            <Title order={2}>
                Seamless upload processing
            </Title>
            <Text>
              Evalua lets you upload all kinds of files for transcripts: Word documents, PDFs, and even images with OCR powered translation.
            </Text>
            
          </Card>
          <Card>

          </Card>

          <Card></Card>
          <Card>
            <Title order={2}>
              AI-powered transcript interpretation and analysis
            </Title>
            <Text>
              Evalua will interpet your transcript, and with our powerful AI tools, award correct credit based on both your local and the international curricula associated with it.
            </Text>
          </Card>
        </SimpleGrid>
          {/* <form>
            <label className="drop-box" htmlFor="transcript-input">
              Drag and drop your transcript or click to select a file!
            </label>
            <input id="transcript-input" name="transcript-input" type="file" />
          </form> */}




          {/* <h1>Ai response:</h1>
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {result}
          </Markdown> */}
        </Stack>
      </Container>
    </AppShell>
  )
}

export default App;
