#!/bin/bash

# Base URL
API_URL="http://localhost:5000/api"

# Register User
echo "Registering user..."
curl -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}' \
  -c cookies.txt
echo -e "\n"

# Login User
echo "Logging in..."
curl -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "password123"}' \
  -c cookies.txt \
  -b cookies.txt
echo -e "\n"

# Check Session (Me)
echo "Checking session..."
curl -X GET "$API_URL/auth/me" \
  -b cookies.txt
echo -e "\n"

# Logout
echo "Logging out..."
curl -X POST "$API_URL/auth/logout" \
  -b cookies.txt
echo -e "\n"

# Check Session Again (Should fail)
echo "Checking session after logout..."
curl -X GET "$API_URL/auth/me" \
  -b cookies.txt
echo -e "\n"
