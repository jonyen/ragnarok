import React, { useState, useCallback } from 'react';
import SimpleChatbot from './components/SimpleChatbot.jsx';
import { extractTextFromFile, chunkText, getFileMetadata, isSupportedFileType } from './utils/simpleFileProcessor.js';
import { getVectorStore } from './utils/vectorStore.js';
import { isEmbeddingProviderConfigured, getEmbeddingProviderInfo, answerWithContext } from './utils/embeddingService.js';
import { isLangChainConfigured, getLangChainProviderInfo } from './utils/langchainService.js';

function App() {
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [processedFiles, setProcessedFiles] = useState(new Map());
  const [error, setError] = useState(null);
  const vectorStore = getVectorStore();

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  // Process specific files and generate embeddings
  const processNewFiles = useCallback(async (filesToProcess) => {
    if (!filesToProcess || filesToProcess.length === 0) return;
    
    setProcessing(true);
    setError(null);
    
    const providerInfo = getEmbeddingProviderInfo();
    if (!providerInfo.configured) {
      setError(`Please configure ${providerInfo.provider} API key in your environment variables`);
      setProcessing(false);
      return;
    }

    try {
      for (const file of filesToProcess) {
        if (processedFiles.has(file.name)) continue;

        console.log(`Processing file: ${file.name}`);
        
        // Check if file type is supported
        if (!isSupportedFileType(file)) {
          console.warn(`Unsupported file type: ${file.name}`);
          continue;
        }

        // Extract text from file
        const text = await extractTextFromFile(file);
        if (!text || text.trim().length === 0) {
          console.warn(`No text extracted from: ${file.name}`);
          continue;
        }

        // Chunk the text
        const chunks = chunkText(text, 800, 100); // Smaller chunks for better embeddings
        console.log(`Created ${chunks.length} chunks for ${file.name}`);

        // Get file metadata
        const metadata = getFileMetadata(file);

        // Add to vector store (this generates embeddings)
        await vectorStore.addDocument(file.name, metadata, chunks);

        // Mark as processed
        setProcessedFiles(prev => new Map(prev).set(file.name, {
          ...metadata,
          chunks: chunks.length,
          processedAt: new Date(),
          text: text.substring(0, 500) + '...' // Preview
        }));

        console.log(`Successfully processed: ${file.name}`);
      }
    } catch (error) {
      console.error('Error processing files:', error);
      setError(`Error processing files: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  }, [processedFiles, vectorStore]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
    
    // Automatically process the new files
    await processNewFiles(droppedFiles);
  }, [processNewFiles]);

  const handleFileInput = useCallback(async (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
    
    // Automatically process the new files
    await processNewFiles(selectedFiles);
  }, [processNewFiles]);

  const removeFile = useCallback((index) => {
    const fileToRemove = files[index];
    if (fileToRemove && processedFiles.has(fileToRemove.name)) {
      // Remove from vector store
      vectorStore.removeDocument(fileToRemove.name);
      setProcessedFiles(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileToRemove.name);
        return newMap;
      });
    }
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, [files, processedFiles, vectorStore]);

  // Handle chatbot messages
  const handleChatMessage = async (userInput) => {
    try {
      const providerInfo = getEmbeddingProviderInfo();
      const userInputLower = userInput.toLowerCase();
      
      // Handle basic general questions first (no document context needed)
      if (userInputLower.includes('what day') || userInputLower.includes('what date') || userInputLower.includes('today')) {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return `Today is ${today.toLocaleDateString('en-US', options)}.`;
      }
      
      if (userInputLower.includes('time') || userInputLower.includes('what time')) {
        const now = new Date();
        return `The current time is ${now.toLocaleTimeString()}.`;
      }
      
      if (userInputLower.includes('weather')) {
        return "I don't have access to current weather data. Try asking about your uploaded documents instead!";
      }
      
      if (userInputLower.includes('hello') || userInputLower.includes('hi ') || userInputLower === 'hi') {
        return "Hello! I'm Ragnarok, your AI document analysis assistant. Upload some files and I'll help you analyze them, or ask me general questions!";
      }
      
      if (userInputLower.includes('how are you')) {
        return "I'm doing great! I'm here to help you analyze documents and answer questions. How can I assist you today?";
      }
      
      if (userInputLower.includes('help') || userInputLower.includes('what can you do')) {
        const stats = vectorStore.getStats();
        let response = `I can help you with:\n\n🤖 **General Questions**: Ask me about dates, time, or general topics\n📄 **Document Analysis**: Upload files for AI-powered analysis\n\n`;
        
        if (stats.totalDocuments > 0) {
          response += `📋 I currently have access to ${stats.totalDocuments} document(s) with ${stats.totalChunks} searchable chunks.\n\n`;
        }
        
        response += `**Supported file types**: PDF, TXT, CSV, JSON, JS, HTML, MD\n🔧 **AI Models**: Using ${providerInfo.provider} embeddings`;
        
        return response;
      }
      
      // Handle basic math or calculations
      if (userInputLower.includes('calculate') || userInputLower.includes('what is') && (userInputLower.includes('+') || userInputLower.includes('-') || userInputLower.includes('*') || userInputLower.includes('/'))) {
        return "I can't perform calculations right now. Try asking about your uploaded documents or general questions like dates and time!";
      }
      
      // Handle personal questions
      if (userInputLower.includes('who are you') || userInputLower.includes('what are you')) {
        return "I'm Ragnarok, an AI document analysis assistant. I can help you analyze uploaded documents using vector embeddings and answer general questions!";
      }
      
      // Check if we have any processed documents for document-specific queries
      const stats = vectorStore.getStats();
      if (stats.totalDocuments === 0) {
        return "I don't have any documents to search yet. Please upload some files above, or ask me general questions like 'what day is today?'";
      }

      // Perform semantic search on uploaded documents
      const results = await vectorStore.search(userInput, 3);
      
      if (results.length === 0) {
        // Check if this might be a general question that doesn't require documents
        if (userInputLower.includes('explain') || userInputLower.includes('what is') || userInputLower.includes('how to') || userInputLower.includes('define')) {
          return `I couldn't find relevant information in your uploaded documents about "${userInput}". For general knowledge questions, I'm limited to basic queries about dates and time. Try asking about specific content from your uploaded files!`;
        }
        return `I searched through your ${stats.totalDocuments} document(s) but couldn't find relevant information about "${userInput}". Try rephrasing your question or ask about different topics covered in your files.`;
      }

      // Use LangChain for enhanced context-aware answering
      const langchainInfo = getLangChainProviderInfo();
      if (langchainInfo.configured || (providerInfo.provider === 'openai' && providerInfo.configured)) {
        try {
          const answer = await answerWithContext(userInput, results);
          const llmProvider = langchainInfo.configured ? `LangChain (${langchainInfo.provider})` : 'OpenAI';
          return `${answer}\n\n🤖 *Powered by ${llmProvider} • Found ${results.length} relevant sections*`;
        } catch (error) {
          console.warn('LLM context answering failed, falling back to basic search:', error.message);
        }
      }

      // Fallback: Return search results
      let response = `Here's what I found in your documents:\n\n`;
      results.forEach((result, index) => {
        response += `**${result.document.metadata.name}** (similarity: ${(result.similarity * 100).toFixed(1)}%)\n`;
        response += `${result.text.substring(0, 200)}...\n\n`;
      });
      
      response += `💡 *Searched ${stats.totalChunks} text chunks using ${providerInfo.provider} embeddings*`;
      return response;
      
    } catch (error) {
      console.error('Chat error:', error);
      return `Sorry, I encountered an error while searching your documents: ${error.message}. Please try again or rephrase your question.`;
    }
  };

  return (
    <div style={{
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0',
      padding: '20px'
    }}>
      {/* Header spanning full width */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{
          color: '#333', 
          fontSize: '2.5rem', 
          marginBottom: '0.5rem',
          margin: 0
        }}>
          🤖 Ragnarok AI
        </h1>
        <p style={{color: '#666', margin: 0, fontSize: '1.1rem'}}>
          Universal document analysis chatbot powered by AI-driven vector embeddings
        </p>
      </div>

      {/* Two-column layout */}
      <div style={{
        display: 'flex',
        gap: '20px'
      }}>
        {/* Left Column - Chatbot */}
        <div style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          minWidth: '400px'
        }}>
        
        {/* Custom Chatbot */}
        <SimpleChatbot onMessage={handleChatMessage} />
      </div>

      {/* Right Column - File Upload & Management */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        minWidth: '400px'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{
            color: '#333', 
            fontSize: '1.8rem', 
            marginBottom: '0.5rem',
            margin: 0
          }}>
            📄 Document Upload
          </h2>
          <p style={{color: '#666', margin: 0}}>
            Upload files to analyze with vector embeddings
          </p>
        </div>

        {/* File Upload Zone */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div 
            style={{
              border: dragOver ? '2px solid #4F46E5' : '2px dashed #D1D5DB',
              borderRadius: '12px',
              padding: '40px',
              textAlign: 'center',
              backgroundColor: dragOver ? '#F3F4F6' : '#FAFAFA',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
          >
            <div style={{fontSize: '3rem', marginBottom: '10px'}}>📁</div>
            <h3 style={{color: '#333', fontSize: '1.2rem', marginBottom: '0.5rem'}}>
              Drop files here or click to browse
            </h3>
            <p style={{color: '#666', marginBottom: '15px'}}>
              Supports: PDF, TXT, CSV, JSON, JS, HTML, MD<br/>
              <em>Files will be analyzed automatically upon upload</em>
            </p>
            <input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileInput}
              style={{display: 'none'}}
              accept=".pdf,.txt,.csv,.json,.js,.jsx,.ts,.tsx,.html,.xml,.md,.markdown"
            />
            <button style={{
              backgroundColor: '#4F46E5',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}>
              Choose Files
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            padding: '15px',
            borderRadius: '12px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <strong>⚠️ Error:</strong> {error}
          </div>
        )}

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div style={{
            backgroundColor: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{color: '#333', fontSize: '1.2rem', marginBottom: '15px'}}>
              📤 Uploaded Files ({files.length})
            </h3>
            <div style={{maxHeight: '200px', overflowY: 'auto'}}>
              {files.map((file, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div>
                    <strong style={{color: '#333'}}>{file.name}</strong>
                    <span style={{color: '#666', marginLeft: '10px', fontSize: '0.9rem'}}>
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    style={{
                      backgroundColor: '#EF4444',
                      color: 'white',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.8rem'
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {processing && (
              <div style={{
                marginTop: '15px',
                padding: '12px',
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.9rem',
                color: '#6B7280'
              }}>
                ⏳ Processing files automatically...
              </div>
            )}
          </div>
        )}

        {/* Processed Files Status */}
        {processedFiles.size > 0 && (
          <div style={{
            backgroundColor: 'white', 
            borderRadius: '12px', 
            padding: '20px', 
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{color: '#333', fontSize: '1.2rem', marginBottom: '15px'}}>
              ✅ Processed Files ({processedFiles.size})
            </h3>
            <div style={{maxHeight: '200px', overflowY: 'auto'}}>
              {Array.from(processedFiles.entries()).map(([fileName, data]) => (
                <div key={fileName} style={{
                  padding: '12px',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  border: '1px solid #BBF7D0'
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <strong style={{color: '#16A34A'}}>{fileName}</strong>
                      <span style={{color: '#666', marginLeft: '10px', fontSize: '0.9rem'}}>
                        {data.chunks} chunks • {(data.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <span style={{color: '#059669', fontSize: '0.8rem', fontWeight: '500'}}>
                      Ready
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{
              marginTop: '15px',
              padding: '12px',
              backgroundColor: '#EBF8FF',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#1E40AF',
              border: '1px solid #BFDBFE'
            }}>
              💬 <strong>Ready!</strong> Ask the AI assistant about your documents in the chat on the left.
            </div>
          </div>
        )}

        {/* Setup Info */}
        {!isEmbeddingProviderConfigured() && (
          <div style={{
            backgroundColor: '#FEF3C7',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            border: '1px solid #FCD34D'
          }}>
            <h3 style={{color: '#92400E', fontSize: '1.1rem', marginBottom: '10px', marginTop: 0}}>
              ⚡ Optional Setup
            </h3>
            <p style={{color: '#92400E', margin: 0, fontSize: '0.9rem'}}>
              Add API keys to .env file for enhanced embedding features. The app works without them for basic functionality.
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default App;