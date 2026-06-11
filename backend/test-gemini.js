require('dotenv').config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  console.log('Key prefix:', process.env.GEMINI_API_KEY?.slice(0, 5));

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash'
  });

  console.log('Calling Gemini...');

  const result = await model.generateContent('Say hello in one sentence');

  console.log('SUCCESS!');
  console.log(result.response.text());
}

main().catch((err) => {
  console.error('ERROR:');
  console.error(err);
});