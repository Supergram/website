import fpdf
from fpdf import FPDF
import textwrap
import os

class PDF(FPDF):
    def header(self):
        self.set_font('Helvetica', 'B', 14)
        self.cell(0, 8, 'Himmin - AWS to GCP Migration Plan', 0, 1, 'C')
        self.set_font('Helvetica', '', 9)
        self.cell(0, 5, 'For Backend Engineer | App is LIVE | Zero Downtime Required', 0, 1, 'C')
        self.cell(0, 5, '3 Services to Move | $300 GCP Credits | ~6 Days Total Work | 40-60% AWS Bill Cut', 0, 1, 'C')
        self.ln(4)
    
    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 7)
        self.cell(0, 10, f'Himmin · Confidential · June 2026 · Do not share outside team', 0, 0, 'C')

    def section_title(self, title):
        self.set_font('Helvetica', 'B', 12)
        self.set_fill_color(240, 240, 240)
        self.cell(0, 7, f'  {title}', 0, 1, 'L', True)
        self.ln(2)

    def body_text(self, txt):
        self.set_font('Helvetica', '', 9.5)
        self.multi_cell(0, 5, txt)
        self.ln(1)

    def code_block(self, code):
        self.set_fill_color(245, 245, 245)
        self.set_font('Courier', '', 8.5)
        for line in code.split('\n'):
            # Truncate very long lines for display
            display_line = line[:120]
            self.cell(0, 4.5, '  ' + display_line, 0, 1, 'L', True)
        self.ln(2)

    def checklist_item(self, text, checked=False):
        self.set_font('Helvetica', '', 9.5)
        mark = '[x]' if checked else '[ ]'
        self.cell(5, 5, '', 0, 0)
        self.cell(0, 5, f'{mark}  {text}', 0, 1)

    def table_row(self, cells, widths, bold=False, fill=False, header=False):
        self.set_font('Helvetica', 'B' if bold else '', 8.5)
        if fill:
            self.set_fill_color(230, 230, 230)
        else:
            self.set_fill_color(255, 255, 255)
        row_h = 6
        x_start = self.get_x()
        for i, cell in enumerate(cells):
            self.cell(widths[i], row_h, cell, 1, 0, 'C', fill)
        self.ln(row_h)

pdf = PDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=15)

# 1. What Moves vs Stays
pdf.section_title("1. What Moves to GCP vs What Stays on AWS")
pdf.set_font('Helvetica', 'B', 8.5)
col_widths = [35, 15, 35, 35, 25]
headers = ['AWS Service', 'Action', 'GCP Replacement', 'Why Move', 'Saving']
pdf.table_row(headers, col_widths, bold=True, fill=True, header=True)
rows = [
    ['Amazon Bedrock', 'MOVE', 'Gemini 1.5 Flash API', '60-70% cheaper', '~$80/mo'],
    ['Amazon Rekognition', 'MOVE', 'GCP Vision API', '1,000 free/mo forever', '~$40/mo'],
    ['Amazon Transcribe', 'MOVE', 'GCP Speech-to-Text', '60 min free/mo', '~$30/mo'],
    ['Cognito, SES, SNS', 'KEEP', 'AWS (already free)', 'Free at 150 users', '$0'],
    ['ECS, RDS, S3, IVS, CloudFront, ElastiCache', 'KEEP', 'AWS (core infra)', 'Too risky now', 'Optimize later'],
    ['Lambda, ECR, ALB, Pinpoint, CloudWatch', 'KEEP', 'AWS', 'Cheap / free tier', 'Monitor only']
]
for row in rows:
    pdf.table_row(row, col_widths, fill=False)
pdf.ln(4)

# 2. GCP Account Setup
pdf.section_title("2. GCP Account Setup - Get $300 Free Credits (Founder to do)")
steps = [
    "1. Go to cloud.google.com/free - Open in Chrome, use company email",
    "2. Click 'Get started for free' (top-right button)",
    "3. Sign in with company Google account (Himmin team email)",
    "4. Country: India, Currency: INR (important - affects billing)",
    "5. Add debit/credit card (required for verification, ZERO charged now)",
    "6. $300 credit activates instantly - Check Billing > Credits in console"
]
for step in steps:
    pdf.body_text(step)

pdf.body_text("After account created - enable APIs + create service account key (share JSON with backend dev):")
code = """# Run in GCP Cloud Shell (browser terminal inside GCP Console)
gcloud services enable aiplatform.googleapis.com vision.googleapis.com speech.googleapis.com

# Create service account for your backend
gcloud iam service-accounts create himmin-backend --display-name='Himmin Backend'

# Download key JSON - send this file to backend developer
gcloud iam service-accounts keys create gcp-key.json \\
    --iam-account=himmin-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com"""
pdf.code_block(code)

# 3. Migration 1 - Bedrock to Gemini
pdf.section_title("3. Migration 1 - Bedrock to Gemini API (Day 1-2)")
pdf.body_text("Estimated saving: ~$80/mo | Effort: 1 day | Risk: Zero (fallback built in)")
pdf.body_text("Install:")
pdf.code_block("npm install @google/generative-ai")
pdf.body_text("Add to .env:")
pdf.code_block("GEMINI_API_KEY=your_key_here  # GCP Console > APIs & Services > Credentials > Create API Key\nUSE_GCP_AI=true             # Set false to instantly rollback")
pdf.body_text("Wrapper code - drop this file in your project, replace Bedrock import with this:")
code = """// ai.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateText(prompt) {
  if (process.env.USE_GCP_AI !== 'true') return awsBedrock(prompt); // rollback switch
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (e) {
    console.error('GCP failed, using Bedrock fallback');
    return awsBedrock(prompt); // your existing Bedrock function
  }
}

module.exports = { generateText };"""
pdf.code_block(code)

# 4. Migration 2 - Rekognition to Vision
pdf.section_title("4. Migration 2 - Rekognition to GCP Vision API (Day 2-3)")
pdf.body_text("Estimated saving: ~$40/mo | Effort: 0.5 day | Free: 1,000 images/month forever")
pdf.code_block("npm install @google-cloud/vision")
code = """// vision.service.js
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GCP_KEY_PATH // path to gcp-key.json
});

async function moderateImage(imageBuffer) {
  if (process.env.USE_GCP_VISION !== 'true') return awsRekognition(imageBuffer);
  try {
    const [result] = await client.safeSearchDetection({ image: { content: imageBuffer } });
    const s = result.safeSearchAnnotation;
    const unsafe = ['LIKELY','VERY_LIKELY'].includes(s.adult) ||
                   ['LIKELY','VERY_LIKELY'].includes(s.violence);
    return { safe: !unsafe };
  } catch (e) {
    return awsRekognition(imageBuffer); // fallback
  }
}

module.exports = { moderateImage };"""
pdf.code_block(code)

# 5. Migration 3 - Transcribe to Speech-to-Text
pdf.section_title("5. Migration 3 - Transcribe to GCP Speech-to-Text (Day 3-4)")
pdf.body_text("Estimated saving: ~$30/mo | Effort: 0.5 day | Supports Hindi (hi-IN) natively")
pdf.code_block("npm install @google-cloud/speech")
code = """// speech.service.js
const speech = require('@google-cloud/speech');
const client = new speech.SpeechClient({ keyFilename: process.env.GCP_KEY_PATH });

async function transcribe(audioBuffer, lang = 'hi-IN') {
  if (process.env.USE_GCP_SPEECH !== 'true') return awsTranscribe(audioBuffer);
  try {
    const [res] = await client.recognize({
      audio: { content: audioBuffer.toString('base64') },
      config: { encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: lang }
    });
    return res.results.map(r => r.alternatives[0].transcript).join(' ');
  } catch (e) {
    return awsTranscribe(audioBuffer); // fallback
  }
}

module.exports = { transcribe };"""
pdf.code_block(code)

# 6. Environment Variables
pdf.section_title("6. Environment Variables - Add to ECS Task Definition + .env")
code = """# ■■ GCP (NEW - add these) ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
GCP_KEY_PATH=/app/config/gcp-key.json     # upload gcp-key.json to your ECS container
GEMINI_API_KEY=your_gemini_api_key         # from GCP Console > Credentials
GCP_PROJECT_ID=himmin-prod

# ■■ Feature Flags (controls rollback - change these, no redeploy of code needed) ■■
USE_GCP_AI=true          # Bedrock -> Gemini       | set false = instant rollback
USE_GCP_VISION=true      # Rekognition -> Vision   | set false = instant rollback
USE_GCP_SPEECH=true      # Transcribe -> Speech    | set false = instant rollback

# ■■ AWS (existing - keep untouched) ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=existing_key
AWS_SECRET_ACCESS_KEY=existing_secret

# ROLLBACK: If anything breaks in production -> AWS Console > ECS > Task Definition,
# set USE_GCP_AI / USE_GCP_VISION / USE_GCP_SPEECH to false, deploy new revision.
# Takes 2 minutes. App never goes down."""
pdf.code_block(code)

# 7. Execution Timeline
pdf.section_title("7. Execution Timeline")
timeline = [
    ("Day 1", "Founder creates GCP account, downloads gcp-key.json, shares with dev", "Founder", "$300 credit unlocked"),
    ("Day 1-2", "Dev integrates Gemini wrapper, tests in staging, deploys with USE_GCP_AI=true", "Backend Dev", "~$80/mo"),
    ("Day 2-3", "Dev migrates Rekognition to GCP Vision API, test + deploy", "Backend Dev", "~$40/mo"),
    ("Day 3-4", "Dev migrates Transcribe to GCP Speech-to-Text, test + deploy", "Backend Dev", "~$30/mo"),
    ("Day 5-6", "Monitor CloudWatch + GCP Logs. Confirm AWS bill dropped. Done.", "Both", "Total: ~$150/mo")
]
col_w = [18, 90, 25, 25]
pdf.set_font('Helvetica', 'B', 8.5)
pdf.table_row(['Day', 'Task', 'Who', 'Saves'], col_w, bold=True, fill=True)
for day, task, who, save in timeline:
    pdf.table_row([day, task, who, save], col_w)
pdf.ln(4)

# 8. Testing Checklist
pdf.section_title("8. Testing Checklist Before Each Go-Live")
pdf.set_font('Helvetica', 'B', 10)
pdf.cell(50, 6, 'Gemini API', 0, 0)
pdf.cell(50, 6, 'Vision API', 0, 0)
pdf.cell(50, 6, 'Speech API', 0, 1)
pdf.set_font('Helvetica', '', 9)
gemini_checks = [
    "Call generateText() with sample prompt",
    "Response returns in <3 seconds",
    "Fallback triggers if GEMINI_API_KEY is wrong",
    "Check GCP Console > APIs > Quotas"
]
vision_checks = [
    "Upload test image, call moderateImage()",
    "Safe image returns { safe: true }",
    "NSFW image returns { safe: false }",
    "Check free tier: 1,000 calls/month"
]
speech_checks = [
    "Send 10s audio clip to transcribe()",
    "Hindi audio transcribes correctly",
    "Check GCP Console > Speech > Usage",
    "Verify fallback to AWS on error"
]
for i in range(4):
    x = pdf.get_x()
    y = pdf.get_y()
    pdf.checklist_item(gemini_checks[i], False)
    pdf.set_xy(x + 65, y)
    pdf.checklist_item(vision_checks[i], False)
    pdf.set_xy(x + 130, y)
    pdf.checklist_item(speech_checks[i], False)
    pdf.set_xy(x, y + 7)  # move down for next row

# Final note
pdf.ln(4)
pdf.set_font('Helvetica', 'I', 8)
pdf.multi_cell(0, 4, "Himmin · AWS to GCP Migration · Confidential · June 2026 · Do not share outside team")

pdf.output("/tmp/Himmin_AWS_GCP_Migration.pdf")
print("PDF generated")