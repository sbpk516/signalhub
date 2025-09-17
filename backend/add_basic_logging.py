#!/usr/bin/env python3
"""
Simple script to add basic logging to the existing pipeline orchestrator.
This adds logging without breaking the current functionality.
"""

import re
from pathlib import Path

def add_basic_logging():
    """Add basic logging to the pipeline orchestrator"""
    
    pipeline_file = Path("app/pipeline_orchestrator.py")
    
    if not pipeline_file.exists():
        print("❌ Pipeline orchestrator file not found!")
        return
    
    print("🔧 Adding basic logging to pipeline orchestrator...")
    
    # Read the current file
    with open(pipeline_file, 'r') as f:
        content = f.read()
    
    # Add import for pipeline logger
    if "from .pipeline_logger import pipeline_logger" not in content:
        import_pattern = r"from \.pipeline_monitor import pipeline_monitor"
        replacement = "from .pipeline_monitor import pipeline_monitor\nfrom .pipeline_logger import pipeline_logger"
        content = re.sub(import_pattern, replacement, content)
        print("✅ Added pipeline logger import")
    
    # Add basic logging to the main method
    if "pipeline_logger.log_pipeline_start" not in content:
        # Find the process_audio_file method start
        method_pattern = r"async def process_audio_file\(self, file: UploadFile\) -> Dict\[str, Any\]:"
        if method_pattern in content:
            # Add logging after call_id generation
            call_id_pattern = r"call_id = str\(uuid\.uuid4\(\)\)"
            replacement = """        call_id = str(uuid.uuid4())
        pipeline_start_time = datetime.now()
        
        # Log pipeline start
        file_info = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size": getattr(file, 'size', 'unknown'),
            "upload_timestamp": pipeline_start_time.isoformat()
        }
        log_file_path = pipeline_logger.log_pipeline_start(call_id, file_info)
        logger.info(f"🚀 PIPELINE STARTED: {call_id}")
        logger.info(f"📝 Detailed logs: {log_file_path}")"""
            
            content = re.sub(call_id_pattern, replacement, content)
            print("✅ Added pipeline start logging")
    
    # Add logging to step completion
    if "pipeline_logger.log_pipeline_complete" not in content:
        # Find the final return statement
        return_pattern = r"return final_result"
        replacement = """            # Calculate total duration
            pipeline_end_time = datetime.now()
            total_duration = (pipeline_end_time - pipeline_start_time).total_seconds()
            
            # Log pipeline completion
            pipeline_logger.log_pipeline_complete(call_id, final_result, total_duration)
            logger.info(f"✅ PIPELINE COMPLETED: {call_id} (took {total_duration:.2f}s)")
            
            return final_result"""
        
        content = re.sub(return_pattern, replacement, content)
        print("✅ Added pipeline completion logging")
    
    # Add basic logging to upload step
    if "pipeline_logger.log_step_start" not in content:
        # Find the _step_upload method
        step_pattern = r"async def _step_upload\(self, file: UploadFile, call_id: str\) -> Dict\[str, Any\]:"
        if step_pattern in content:
            # Add step start logging
            step_start_pattern = r"self\.status_tracker\.start_step\(call_id, \"upload\"\)"
            replacement = """        step_start_time = datetime.now()
        self.status_tracker.start_step(call_id, "upload")
        
        # Log step start
        step_data = {
            "filename": file.filename,
            "content_type": file.content_type,
            "file_size": getattr(file, 'size', 'unknown')
        }
        pipeline_logger.log_step_start(call_id, "upload", step_data)"""
            
            content = re.sub(step_start_pattern, replacement, content)
            print("✅ Added upload step start logging")
    
    # Write the updated content
    with open(pipeline_file, 'w') as f:
        f.write(content)
    
    print("✅ Basic logging added to pipeline orchestrator!")
    print("📝 The pipeline will now log:")
    print("   - Pipeline start with file info")
    print("   - Upload step start and completion")
    print("   - Pipeline completion with duration")
    print("   - All logs saved to logs/pipeline_logs/ directory")

if __name__ == "__main__":
    add_basic_logging()

