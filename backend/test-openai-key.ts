import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

async function testOpenAI() {
  try {
    console.log('🔑 Testing OpenAI API key...');
    console.log('🔧 API Key configured:', process.env.OPENAI_API_KEY ? 'Yes (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : 'No');

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ No OpenAI API key found in environment variables');
      process.exit(1);
    }

    const openai = new OpenAI({
      api_key: process.env.OPENAI_API_KEY,
    });

    console.log('📡 Testing API connection...');

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "user", content: "Say 'Hello from Blank Wars!' if you can read this." }
      ],
      max_tokens: 20
    });

    console.log('✅ OpenAI API test successful!');
    console.log('📝 Response:', completion.choices[0].message.content);

  } catch (error) {
    console.error('❌ OpenAI API test failed:', error.message);
    if (error.code) {
      console.error('🔍 Error code:', error.code);
    }
    process.exit(1);
  }
}

testOpenAI();
