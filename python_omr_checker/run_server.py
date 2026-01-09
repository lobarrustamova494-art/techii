#!/usr/bin/env python3
"""
OMR Server Launcher
Production-ready launcher for the OMR processing server
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are installed"""
    required_packages = [
        'cv2', 'numpy', 'PIL', 'flask', 'flask_cors'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        logger.error(f"Missing required packages: {', '.join(missing_packages)}")
        logger.error("Please install them using: pip install -r requirements.txt")
        return False
    
    return True

def setup_directories():
    """Create necessary directories"""
    directories = ['uploads', 'debug_output', 'logs']
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        logger.info(f"Directory ready: {directory}")

def main():
    """Main launcher function"""
    logger.info("🚀 Starting Python OMR Processing Server")
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Setup directories
    setup_directories()
    
    # Get configuration from environment
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('DEBUG', 'false').lower() == 'true'
    workers = int(os.getenv('WORKERS', 1))
    
    logger.info(f"Configuration:")
    logger.info(f"  Host: {host}")
    logger.info(f"  Port: {port}")
    logger.info(f"  Debug: {debug}")
    logger.info(f"  Workers: {workers}")
    
    # Import and run server
    try:
        from omr_server import app
        
        if workers > 1:
            # Use Gunicorn for production with multiple workers
            try:
                import gunicorn.app.base
                
                class StandaloneApplication(gunicorn.app.base.BaseApplication):
                    def __init__(self, app, options=None):
                        self.options = options or {}
                        self.application = app
                        super().__init__()
                    
                    def load_config(self):
                        config = {key: value for key, value in self.options.items()
                                if key in self.cfg.settings and value is not None}
                        for key, value in config.items():
                            self.cfg.set(key.lower(), value)
                    
                    def load(self):
                        return self.application
                
                options = {
                    'bind': f'{host}:{port}',
                    'workers': workers,
                    'worker_class': 'sync',
                    'timeout': 300,
                    'keepalive': 2,
                    'max_requests': 1000,
                    'max_requests_jitter': 100,
                    'preload_app': True,
                    'access_log_format': '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s',
                }
                
                logger.info(f"Starting Gunicorn server with {workers} workers")
                StandaloneApplication(app, options).run()
                
            except ImportError:
                logger.warning("Gunicorn not available, falling back to Flask dev server")
                app.run(host=host, port=port, debug=debug, threaded=True)
        else:
            # Single worker Flask development server
            logger.info("Starting Flask development server")
            app.run(host=host, port=port, debug=debug, threaded=True)
            
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()