"""
Prompt templates for resume-job matching analysis.
Contains carefully crafted prompts for different AI models.
"""

# Main resume-job matching prompt template
RESUME_JOB_MATCHING_PROMPT = """
You are an expert HR analyst and recruitment specialist. Your task is to analyze how well a candidate's resume matches a specific job posting.

Please carefully analyze the following resume and job posting data:

**RESUME DATA:**
{resume_json}

**JOB POSTING DATA:**
{job_json}

**ANALYSIS INSTRUCTIONS:**

1. **Scoring Guidelines (0-100 scale):**
   - 90-100: Exceptional match - candidate exceeds requirements with relevant experience
   - 80-89: Excellent match - candidate meets most requirements with strong background
   - 70-79: Good match - candidate meets core requirements with some gaps
   - 60-69: Fair match - candidate has relevant skills but missing key requirements
   - 50-59: Moderate match - some relevant experience but significant gaps
   - 30-49: Weak match - limited relevant experience
   - 0-29: Poor match - very little relevant experience

2. **Evaluation Criteria:**
   - **Skills Alignment (40%)**: Technical skills, tools, technologies
   - **Experience Level (30%)**: Years of experience, seniority level
   - **Industry/Domain (15%)**: Relevant industry experience
   - **Education (10%)**: Educational background and qualifications
   - **Culture Fit (5%)**: Soft skills, work style alignment

3. **Analysis Requirements:**
   - Provide a comprehensive summary of the match quality
   - Identify 3-5 key strengths where the candidate excels
   - List 2-4 main gaps or areas for improvement
   - Give 2-3 specific recommendations for the candidate
   - Explain your reasoning for the final score

**IMPORTANT:** You must return your analysis in the following JSON format by calling the analyze_resume_job_match function:

```json
{
  "matching_score": <integer 0-100>,
  "ai_analysis": {
    "summary": "<brief 2-3 sentence summary of match quality>",
    "strengths": [
      "<specific strength 1>",
      "<specific strength 2>",
      "<specific strength 3>"
    ],
    "gaps": [
      "<gap or missing requirement 1>",
      "<gap or missing requirement 2>"
    ],
    "recommendations": [
      "<specific recommendation 1>",
      "<specific recommendation 2>"
    ],
    "reasoning": "<detailed explanation for the score, covering all evaluation criteria>"
  }
}
```

Please be thorough, objective, and provide actionable insights for both the candidate and the hiring manager.
"""

# Alternative prompt for models without function calling
RESUME_JOB_MATCHING_PROMPT_SIMPLE = """
Analyze how well this resume matches the job posting. Rate from 0-100 where 90+ means exceptional match.

RESUME:
{resume_json}

JOB POSTING:
{job_json}

Return your analysis as JSON:
{{
  "matching_score": <0-100>,
  "ai_analysis": {{
    "summary": "<brief summary>",
    "strengths": ["<strength1>", "<strength2>"],
    "gaps": ["<gap1>", "<gap2>"],
    "recommendations": ["<rec1>", "<rec2>"],
    "reasoning": "<detailed reasoning>"
  }}
}}
"""

# Quick scoring prompt for high-volume processing
QUICK_MATCH_PROMPT = """
Rate this resume-job match (0-100):

Resume skills: {resume_skills}
Job requirements: {job_requirements}

Score: """

def get_matching_prompt(use_function_calling: bool = True) -> str:
    """
    Get the appropriate prompt template based on model capabilities.
    
    Args:
        use_function_calling: Whether the model supports function calling
        
    Returns:
        Appropriate prompt template
    """
    return RESUME_JOB_MATCHING_PROMPT if use_function_calling else RESUME_JOB_MATCHING_PROMPT_SIMPLE

def extract_resume_summary(resume_data: dict) -> dict:
    """
    Extract key information from resume for AI analysis.
    
    Args:
        resume_data: Full resume data from database
        
    Returns:
        Summarized resume data for AI processing
    """
    return {
        "personal_info": {
            "name": f"{resume_data.get('first_name', '')} {resume_data.get('last_name', '')}".strip(),
            "email": resume_data.get('email'),
            "location": resume_data.get('location'),
            "professional_summary": resume_data.get('professional_summary')
        },
        "work_experience": resume_data.get('work_experience', []),
        "education": resume_data.get('education', []),
        "skills": resume_data.get('skills', []),
        "projects": resume_data.get('projects', []),
        "certifications": resume_data.get('certifications', []),
        "target_role": resume_data.get('target_role')
    }

def extract_job_summary(job_data: dict) -> dict:
    """
    Extract key information from job posting for AI analysis.
    
    Args:
        job_data: Job data from AgentFoundJobs
        
    Returns:
        Summarized job data for AI processing
    """
    return {
        "job_info": {
            "title": job_data.get('title'),
            "company": job_data.get('company'),
            "location": job_data.get('location'),
            "work_type": job_data.get('work_type'),
            "salary": job_data.get('salary')
        },
        "job_description": job_data.get('detailed_description', ''),
        "job_url": job_data.get('job_url'),
        "source_platform": job_data.get('source_platform')
    }
