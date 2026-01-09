#!/bin/bash

echo "🧪 Testing OMR endpoint..."

# Create a dummy image file
echo "dummy image data" > test_image.jpg

# Test the OMR endpoint
curl -X POST http://localhost:10000/api/omr/process \
  -F "image=@test_image.jpg" \
  -F "answerKey=[\"A\",\"B\",\"C\",\"D\",\"A\"]" \
  -F "scoring={\"correct\":1,\"wrong\":0,\"blank\":0}" \
  -F "examId=test-exam-id" \
  -v

# Clean up
rm test_image.jpg

echo -e "\n✅ Test completed"