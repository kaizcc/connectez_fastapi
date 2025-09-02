"""
LLM Client for resume-job matching analysis.
Supports multiple AI providers with easy switching.
"""
import json
import logging
import os
import re
from enum import Enum
from typing import Any, Dict, Optional, Tuple

# Import different AI clients
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import google.generativeai as genai
    GOOGLE_AVAILABLE = True
except ImportError:
    GOOGLE_AVAILABLE = False

logger = logging.getLogger(__name__)


class AIProvider(str, Enum):
    """Supported AI providers"""
    OPENAI = "openai"
    GOOGLE = "google"
    AZURE_OPENAI = "azure_openai"
    DEEPSEEK = "deepseek"


class LLMClient:
    """
    Universal LLM client for resume-job matching analysis.
    Supports multiple AI providers with consistent interface.
    """
    
    def __init__(self, provider: AIProvider = AIProvider.DEEPSEEK):
        self.provider = provider
        self.client = None
        self._setup_client()
    
    def _setup_client(self):
        """Initialize the appropriate AI client based on provider"""
        try:
            if self.provider == AIProvider.DEEPSEEK:
                self._setup_deepseek_client()
            elif self.provider == AIProvider.OPENAI:
                self._setup_openai_client()
            elif self.provider == AIProvider.GOOGLE:
                self._setup_google_client()
            elif self.provider == AIProvider.AZURE_OPENAI:
                self._setup_azure_openai_client()
            else:
                raise ValueError(f"Unsupported AI provider: {self.provider}")
                
        except Exception as e:
            logger.error(f"Failed to initialize {self.provider} client: {e}")
            raise
    
    def _setup_deepseek_client(self):
        """Setup DeepSeek client"""
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI package required for DeepSeek")
        
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            raise ValueError("DEEPSEEK_API_KEY not found in environment")
        
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.deepseek.com"
        )
        logger.info("DeepSeek client initialized successfully")
    
    def _setup_openai_client(self):
        """Setup OpenAI client"""
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI package required")
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment")
        
        self.client = openai.OpenAI(api_key=api_key)
        logger.info("OpenAI client initialized successfully")
    
    def _setup_google_client(self):
        """Setup Google AI client"""
        if not GOOGLE_AVAILABLE:
            raise ImportError("Google AI package required")
        
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment")
        
        genai.configure(api_key=api_key)
        # Use current model name - 2.5 Flash is the latest stable model
        model_name = os.getenv("GOOGLE_MODEL", "gemini-2.5-flash")
        self.client = genai.GenerativeModel(model_name)
        logger.info(f"Google AI client initialized successfully with model: {model_name}")
    
    def _setup_azure_openai_client(self):
        """Setup Azure OpenAI client"""
        if not OPENAI_AVAILABLE:
            raise ImportError("OpenAI package required for Azure OpenAI")
        
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        if not api_key or not endpoint:
            raise ValueError("Azure OpenAI credentials not found")
        
        # Make API version configurable - use latest version
        api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2025-02-01-preview")
        self.client = openai.AzureOpenAI(
            api_key=api_key,
            azure_endpoint=endpoint,
            api_version=api_version
        )
        logger.info("Azure OpenAI client initialized successfully")
    
    def analyze_resume_job_match(
        self, 
        resume_data: Dict[str, Any], 
        job_data: Dict[str, Any],
        prompt_template: str
    ) -> Tuple[int, Dict[str, Any]]:
        """
        Analyze resume-job match using AI.
        
        Args:
            resume_data: Resume information as JSON
            job_data: Job information as JSON
            prompt_template: Prompt template with placeholders
            
        Returns:
            Tuple of (match_score, analysis_dict)
        """
        try:
            # Format the prompt without triggering Python str.format on JSON braces
            resume_json_str = json.dumps(resume_data, indent=2)
            job_json_str = json.dumps(job_data, indent=2)
            prompt = (
                prompt_template
                .replace("{resume_json}", resume_json_str)
                .replace("{job_json}", job_json_str)
            )
            
            if self.provider in [AIProvider.OPENAI, AIProvider.DEEPSEEK, AIProvider.AZURE_OPENAI]:
                use_fc = self.provider in [AIProvider.OPENAI, AIProvider.AZURE_OPENAI]
                return self._analyze_with_openai_api(prompt, use_function_calling=use_fc)
            elif self.provider == AIProvider.GOOGLE:
                return self._analyze_with_google_api(prompt)
            else:
                raise ValueError(f"Analysis not implemented for {self.provider}")
                
        except Exception as e:
            logger.error(f"Error analyzing resume-job match: {e}")
            # Return default values on error
            return 0, {
                "error": str(e), 
                "summary": "Analysis failed due to an error.",
                "strengths": [],
                "gaps": ["Analysis error occurred"],
                "recommendations": ["Check system configuration and try again"],
                "reasoning": f"Error: {str(e)}"
            }
    
    def _analyze_with_openai_api(self, prompt: str, use_function_calling: bool = True) -> Tuple[int, Dict[str, Any]]:
        """Analyze using OpenAI-compatible API (OpenAI, DeepSeek, Azure)
        
        Args:
            prompt: Prepared prompt string
            use_function_calling: Whether to attempt function-calling first
        """
        try:
            # Define the function schema for structured output
            function_schema = {
                "name": "analyze_resume_job_match",
                "description": "Analyze how well a resume matches a job posting",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "matching_score": {
                            "type": "integer",
                            "description": "Match score from 0-100, where 90+ is extremely good match",
                            "minimum": 0,
                            "maximum": 100
                        },
                        "ai_analysis": {
                            "type": "object",
                            "properties": {
                                "summary": {
                                    "type": "string", 
                                    "description": "Brief summary of the match"
                                },
                                "strengths": {
                                    "type": "array", 
                                    "items": {"type": "string"}, 
                                    "description": "Key matching strengths"
                                },
                                "gaps": {
                                    "type": "array", 
                                    "items": {"type": "string"}, 
                                    "description": "Skill or experience gaps"
                                },
                                "recommendations": {
                                    "type": "array", 
                                    "items": {"type": "string"}, 
                                    "description": "Recommendations for improvement"
                                },
                                "reasoning": {
                                    "type": "string", 
                                    "description": "Detailed reasoning for the score"
                                }
                            },
                            "required": ["summary", "strengths", "gaps", "recommendations", "reasoning"]
                        }
                    },
                    "required": ["matching_score", "ai_analysis"]
                }
            }
            
            model_name = self._get_model_name()
            
            # Try function calling first (disabled for DeepSeek)
            if use_function_calling:
                try:
                    response = self.client.chat.completions.create(
                        model=model_name,
                        messages=[
                            {"role": "system", "content": "You are an expert HR analyst specializing in resume-job matching."},
                            {"role": "user", "content": prompt}
                        ],
                        functions=[function_schema],
                        function_call={"name": "analyze_resume_job_match"},
                        temperature=0.3,
                        max_tokens=2000
                    )
                    
                    # Parse the function call response
                    function_call = response.choices[0].message.function_call
                    if function_call and function_call.name == "analyze_resume_job_match":
                        try:
                            result = json.loads(function_call.arguments)
                            score = int(result.get("matching_score", 0))
                            analysis = result.get("ai_analysis", {})
                            return score, analysis
                        except Exception as parse_err:
                            logger.warning(f"Function-call parse failed: {parse_err}; falling back to content parsing")
                except Exception as function_error:
                    logger.warning(f"Function calling failed: {function_error}, trying fallback")
            
            # Fallback to regular completion
            # Prefer JSON-only response when provider supports it (OpenAI-compatible)
            extra_kwargs = {}
            try:
                extra_kwargs["response_format"] = {"type": "json_object"}
            except Exception:
                pass

            response = self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "system", 
                        "content": (
                            "You are an expert HR analyst specializing in resume-job matching. "
                            "Return ONLY a valid JSON object with keys 'matching_score' (0-100) and 'ai_analysis' "
                            "(with fields summary, strengths, gaps, recommendations, reasoning). No extra text or code fences."
                        )
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=2000,
                **extra_kwargs
            )
            
            content = response.choices[0].message.content or ""
            # Try direct JSON parse first
            try:
                parsed = json.loads(content)
                score = int(parsed.get("matching_score", 0))
                analysis = parsed.get("ai_analysis", {})
                return score, analysis
            except Exception:
                return self._parse_fallback_response(content)
                
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            raise
    
    def _analyze_with_google_api(self, prompt: str) -> Tuple[int, Dict[str, Any]]:
        """Analyze using Google Gemini API"""
        try:
            # For Gemini 2.5+ models, we can use function calling for structured output
            try:
                # Try using function calling for structured output (available in Gemini 2.0+)
                function_declaration = genai.protos.FunctionDeclaration(
                    name="analyze_resume_job_match",
                    description="Analyze how well a resume matches a job posting",
                    parameters=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={
                            'matching_score': genai.protos.Schema(
                                type=genai.protos.Type.INTEGER,
                                description="Match score from 0-100"
                            ),
                            'ai_analysis': genai.protos.Schema(
                                type=genai.protos.Type.OBJECT,
                                properties={
                                    'summary': genai.protos.Schema(type=genai.protos.Type.STRING),
                                    'strengths': genai.protos.Schema(
                                        type=genai.protos.Type.ARRAY,
                                        items=genai.protos.Schema(type=genai.protos.Type.STRING)
                                    ),
                                    'gaps': genai.protos.Schema(
                                        type=genai.protos.Type.ARRAY,
                                        items=genai.protos.Schema(type=genai.protos.Type.STRING)
                                    ),
                                    'recommendations': genai.protos.Schema(
                                        type=genai.protos.Type.ARRAY,
                                        items=genai.protos.Schema(type=genai.protos.Type.STRING)
                                    ),
                                    'reasoning': genai.protos.Schema(type=genai.protos.Type.STRING)
                                }
                            )
                        }
                    )
                )
                
                tool = genai.protos.Tool(function_declarations=[function_declaration])
                
                enhanced_prompt = (
                    "You are an expert HR analyst. Use the analyze_resume_job_match function to provide structured analysis.\n\n"
                    + prompt
                )
                
                response = self.client.generate_content(
                    enhanced_prompt,
                    tools=[tool],
                    tool_config=genai.types.ToolConfig(
                        function_calling_config=genai.types.FunctionCallingConfig(
                            mode=genai.types.FunctionCallingConfig.Mode.ANY,
                            allowed_function_names=["analyze_resume_job_match"]
                        )
                    )
                )
                
                # Parse function call response
                if response.candidates[0].content.parts[0].function_call:
                    func_call = response.candidates[0].content.parts[0].function_call
                    if func_call.name == "analyze_resume_job_match":
                        args = dict(func_call.args)
                        return args["matching_score"], args["ai_analysis"]
                        
            except Exception as function_error:
                logger.warning(f"Google function calling failed: {function_error}, trying fallback")
            
            # Fallback to regular text generation
            enhanced_prompt = (
                "You are an expert HR analyst specializing in resume-job matching. "
                "Return your analysis as a valid JSON object with 'matching_score' (0-100) and 'ai_analysis' fields. "
                "The ai_analysis should contain: summary, strengths, gaps, recommendations, and reasoning fields.\n\n"
                + prompt
            )
            
            response = self.client.generate_content(enhanced_prompt)
            content = response.text
            return self._parse_fallback_response(content)
            
        except Exception as e:
            logger.error(f"Google API error: {e}")
            raise
    
    def _get_model_name(self) -> str:
        """Get the appropriate model name for the provider"""
        model_mapping = {
            AIProvider.DEEPSEEK: os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            AIProvider.OPENAI: os.getenv("OPENAI_MODEL", "gpt-4o-mini"),  # Updated default
            AIProvider.AZURE_OPENAI: os.getenv("AZURE_OPENAI_MODEL", "gpt-4o-mini")  # Updated default
        }
        
        model = model_mapping.get(self.provider)
        if not model:
            raise ValueError(f"No model defined for {self.provider}")
        return model
    
    def _parse_fallback_response(self, content: str) -> Tuple[int, Dict[str, Any]]:
        """Parse response when function calling is not available
        
        - Strips markdown code fences
        - Extracts JSON blocks robustly
        - Defensively handles missing keys
        """
        try:
            # Remove markdown code fences if present
            content = re.sub(r"```(?:json)?\s*([\s\S]*?)\s*```", r"\1", content, flags=re.DOTALL)
            
            # Try to find complete JSON objects
            json_pattern = r'\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}'
            json_matches = re.findall(json_pattern, content, re.DOTALL)
            
            for json_str in json_matches:
                try:
                    result = json.loads(json_str.strip())
                    
                    # Check if it has the expected structure
                    if "matching_score" in result and "ai_analysis" in result:
                        # Validate ai_analysis structure
                        analysis = result["ai_analysis"]
                        required_fields = ["summary", "strengths", "gaps", "recommendations", "reasoning"]
                        
                        if all(field in analysis for field in required_fields):
                            return int(result.get("matching_score", 0)), result.get("ai_analysis", {})
                        else:
                            # Fill missing fields
                            for field in required_fields:
                                if field not in analysis:
                                    if field in ["strengths", "gaps", "recommendations"]:
                                        analysis[field] = []
                                    else:
                                        analysis[field] = "Not provided"
                            return int(result.get("matching_score", 0)), analysis
                            
                except json.JSONDecodeError as json_error:
                    logger.debug(f"Failed to parse JSON: {json_error}")
                    continue
            
            # Fallback: extract score from text and create basic analysis
            score_patterns = [
                r'(?:matching_score|match.*?score|score).*?[:\s](\d+)',
                r'(\d+)(?:/100|\s*%|\s*out\s*of\s*100)',
                r'score.*?(\d+)'
            ]
            
            score = 50  # default score
            for pattern in score_patterns:
                match = re.search(pattern, content, re.IGNORECASE)
                if match:
                    score = min(100, max(0, int(match.group(1))))
                    break
            
            return score, {
                "summary": "Analysis completed with limited parsing",
                "strengths": ["Score extracted from response"],
                "gaps": ["Detailed structured analysis not available"],
                "recommendations": ["Improve AI response format for better parsing"],
                "reasoning": content[:500] + "..." if len(content) > 500 else content
            }
            
        except Exception as e:
            logger.error(f"Error parsing response: {e}")
            return 0, {
                "summary": "Analysis failed due to parsing error",
                "strengths": [],
                "gaps": ["Response parsing failed"],
                "recommendations": ["Check AI model response format and try again"],
                "reasoning": f"Parse error: {str(e)}. Content preview: {content[:200]}..."
            }


def create_llm_client(provider: str = "deepseek") -> LLMClient:
    """
    Factory function to create LLM client.
    
    Args:
        provider: AI provider name (openai, google, azure_openai, deepseek)
        
    Returns:
        Configured LLMClient instance
    """
    try:
        provider_enum = AIProvider(provider.lower())
        return LLMClient(provider_enum)
    except ValueError as e:
        logger.warning(f"Unknown provider '{provider}', defaulting to DeepSeek. Error: {e}")
        return LLMClient(AIProvider.DEEPSEEK)