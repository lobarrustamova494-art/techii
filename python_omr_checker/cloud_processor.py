#!/usr/bin/env python3
"""
Cloud Processing Integration for EvalBee Professional OMR System
Enables distributed processing across multiple cloud instances
"""

import asyncio
import aiohttp
import json
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
import hashlib

logger = logging.getLogger(__name__)

@dataclass
class CloudInstance:
    """Cloud processing instance information"""
    id: str
    url: str
    region: str
    capacity: int
    current_load: int
    status: str  # 'online', 'offline', 'busy'
    last_ping: float
    processing_time_avg: float

@dataclass
class ProcessingJob:
    """Cloud processing job"""
    id: str
    image_data: str  # Base64 encoded
    answer_key: List[str]
    processing_mode: str
    priority: int  # 1-10, higher = more priority
    created_at: float
    assigned_instance: Optional[str] = None
    status: str = 'pending'  # 'pending', 'processing', 'completed', 'failed'
    result: Optional[Dict] = None
    error: Optional[str] = None
    processing_time: float = 0.0

@dataclass
class CloudProcessingResult:
    """Cloud processing result"""
    job_id: str
    success: bool
    result: Optional[Dict]
    processing_time: float
    instance_id: str
    error: Optional[str] = None

class CloudOMRProcessor:
    """Distributed cloud OMR processing system"""
    
    def __init__(self):
        self.instances: Dict[str, CloudInstance] = {}
        self.jobs: Dict[str, ProcessingJob] = {}
        self.load_balancer_strategy = 'least_loaded'  # 'round_robin', 'least_loaded', 'fastest'
        self.health_check_interval = 30  # seconds
        self.max_retries = 3
        self.timeout = 60  # seconds
        
        # Initialize with default instances (can be configured)
        self._initialize_default_instances()
        
        # Start background tasks
        asyncio.create_task(self._health_check_loop())
    
    def _initialize_default_instances(self):
        """Initialize default cloud instances"""
        default_instances = [
            {
                'id': 'render-primary',
                'url': 'https://ultra-precision-python-omr.onrender.com',
                'region': 'us-east',
                'capacity': 10
            },
            {
                'id': 'render-backup',
                'url': 'https://evalbee-omr-backup.onrender.com',
                'region': 'us-west',
                'capacity': 8
            },
            # Add more instances as needed
        ]
        
        for instance_config in default_instances:
            instance = CloudInstance(
                id=instance_config['id'],
                url=instance_config['url'],
                region=instance_config['region'],
                capacity=instance_config['capacity'],
                current_load=0,
                status='unknown',
                last_ping=0,
                processing_time_avg=5.0
            )
            self.instances[instance.id] = instance
    
    async def add_instance(self, instance_id: str, url: str, region: str, capacity: int = 10):
        """Add a new cloud processing instance"""
        instance = CloudInstance(
            id=instance_id,
            url=url,
            region=region,
            capacity=capacity,
            current_load=0,
            status='unknown',
            last_ping=0,
            processing_time_avg=5.0
        )
        
        self.instances[instance_id] = instance
        
        # Immediate health check
        await self._check_instance_health(instance)
        
        logger.info(f"✅ Added cloud instance: {instance_id} ({url})")
    
    async def remove_instance(self, instance_id: str):
        """Remove a cloud processing instance"""
        if instance_id in self.instances:
            del self.instances[instance_id]
            logger.info(f"🗑️ Removed cloud instance: {instance_id}")
    
    async def submit_job(self, image_data: str, answer_key: List[str], 
                        processing_mode: str = 'professional', priority: int = 5) -> str:
        """Submit a new processing job to the cloud"""
        
        job_id = str(uuid.uuid4())
        
        job = ProcessingJob(
            id=job_id,
            image_data=image_data,
            answer_key=answer_key,
            processing_mode=processing_mode,
            priority=priority,
            created_at=time.time()
        )
        
        self.jobs[job_id] = job
        
        # Try to assign and process immediately
        await self._process_job(job)
        
        logger.info(f"📤 Submitted job: {job_id} (mode: {processing_mode}, priority: {priority})")
        
        return job_id
    
    async def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get the status of a processing job"""
        if job_id not in self.jobs:
            return None
        
        job = self.jobs[job_id]
        
        return {
            'id': job.id,
            'status': job.status,
            'processing_mode': job.processing_mode,
            'priority': job.priority,
            'created_at': job.created_at,
            'assigned_instance': job.assigned_instance,
            'processing_time': job.processing_time,
            'result': job.result,
            'error': job.error
        }
    
    async def wait_for_job(self, job_id: str, timeout: float = 60) -> CloudProcessingResult:
        """Wait for a job to complete and return the result"""
        
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if job_id not in self.jobs:
                raise ValueError(f"Job {job_id} not found")
            
            job = self.jobs[job_id]
            
            if job.status == 'completed':
                return CloudProcessingResult(
                    job_id=job_id,
                    success=True,
                    result=job.result,
                    processing_time=job.processing_time,
                    instance_id=job.assigned_instance or 'unknown'
                )
            elif job.status == 'failed':
                return CloudProcessingResult(
                    job_id=job_id,
                    success=False,
                    result=None,
                    processing_time=job.processing_time,
                    instance_id=job.assigned_instance or 'unknown',
                    error=job.error
                )
            
            # Wait a bit before checking again
            await asyncio.sleep(0.5)
        
        # Timeout
        return CloudProcessingResult(
            job_id=job_id,
            success=False,
            result=None,
            processing_time=time.time() - start_time,
            instance_id='timeout',
            error='Job timeout'
        )
    
    async def _process_job(self, job: ProcessingJob):
        """Process a job by assigning it to an available instance"""
        
        # Find best instance
        instance = await self._select_best_instance()
        
        if not instance:
            job.status = 'failed'
            job.error = 'No available instances'
            logger.error(f"❌ No available instances for job {job.id}")
            return
        
        job.assigned_instance = instance.id
        job.status = 'processing'
        instance.current_load += 1
        
        logger.info(f"🔄 Processing job {job.id} on instance {instance.id}")
        
        try:
            # Process the job
            result = await self._execute_job_on_instance(job, instance)
            
            job.status = 'completed'
            job.result = result
            job.processing_time = time.time() - job.created_at
            
            # Update instance stats
            instance.processing_time_avg = (
                instance.processing_time_avg * 0.8 + job.processing_time * 0.2
            )
            
            logger.info(f"✅ Job {job.id} completed in {job.processing_time:.2f}s")
            
        except Exception as e:
            job.status = 'failed'
            job.error = str(e)
            job.processing_time = time.time() - job.created_at
            
            logger.error(f"❌ Job {job.id} failed: {e}")
            
        finally:
            instance.current_load = max(0, instance.current_load - 1)
    
    async def _execute_job_on_instance(self, job: ProcessingJob, instance: CloudInstance) -> Dict:
        """Execute a job on a specific cloud instance"""
        
        # Prepare request data
        form_data = aiohttp.FormData()
        
        # Convert base64 image to file-like object
        import base64
        import io
        
        if ',' in job.image_data:
            image_bytes = base64.b64decode(job.image_data.split(',')[1])
        else:
            image_bytes = base64.b64decode(job.image_data)
        
        form_data.add_field('image', io.BytesIO(image_bytes), filename='image.jpg', content_type='image/jpeg')
        form_data.add_field('answerKey', json.dumps(job.answer_key))
        
        # Set processing mode
        if job.processing_mode == 'professional':
            form_data.add_field('professional', 'true')
        elif job.processing_mode == 'anchor_based':
            form_data.add_field('anchor_based', 'true')
        else:
            form_data.add_field('evalbee', 'true')
        
        # Make request to cloud instance
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
            endpoint = f"{instance.url}/api/omr/process"
            
            async with session.post(endpoint, data=form_data) as response:
                if response.status == 200:
                    result = await response.json()
                    if result.get('success'):
                        return result['data']
                    else:
                        raise Exception(result.get('message', 'Processing failed'))
                else:
                    error_text = await response.text()
                    raise Exception(f"HTTP {response.status}: {error_text}")
    
    async def _select_best_instance(self) -> Optional[CloudInstance]:
        """Select the best available instance based on load balancing strategy"""
        
        available_instances = [
            instance for instance in self.instances.values()
            if instance.status == 'online' and instance.current_load < instance.capacity
        ]
        
        if not available_instances:
            return None
        
        if self.load_balancer_strategy == 'least_loaded':
            # Select instance with lowest current load percentage
            return min(available_instances, key=lambda i: i.current_load / i.capacity)
        
        elif self.load_balancer_strategy == 'fastest':
            # Select instance with lowest average processing time
            return min(available_instances, key=lambda i: i.processing_time_avg)
        
        elif self.load_balancer_strategy == 'round_robin':
            # Simple round-robin selection
            return available_instances[len(self.jobs) % len(available_instances)]
        
        else:
            # Default to first available
            return available_instances[0]
    
    async def _health_check_loop(self):
        """Background task to check instance health"""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                # Check all instances
                tasks = [self._check_instance_health(instance) for instance in self.instances.values()]
                await asyncio.gather(*tasks, return_exceptions=True)
                
            except Exception as e:
                logger.error(f"Health check loop error: {e}")
    
    async def _check_instance_health(self, instance: CloudInstance):
        """Check the health of a single instance"""
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(f"{instance.url}/health") as response:
                    if response.status == 200:
                        instance.status = 'online'
                        instance.last_ping = time.time()
                    else:
                        instance.status = 'offline'
        except Exception as e:
            instance.status = 'offline'
            logger.warning(f"Instance {instance.id} health check failed: {e}")
    
    def get_cluster_status(self) -> Dict[str, Any]:
        """Get overall cluster status"""
        
        total_capacity = sum(i.capacity for i in self.instances.values())
        total_load = sum(i.current_load for i in self.instances.values())
        online_instances = sum(1 for i in self.instances.values() if i.status == 'online')
        
        pending_jobs = sum(1 for j in self.jobs.values() if j.status == 'pending')
        processing_jobs = sum(1 for j in self.jobs.values() if j.status == 'processing')
        completed_jobs = sum(1 for j in self.jobs.values() if j.status == 'completed')
        failed_jobs = sum(1 for j in self.jobs.values() if j.status == 'failed')
        
        return {
            'instances': {
                'total': len(self.instances),
                'online': online_instances,
                'offline': len(self.instances) - online_instances
            },
            'capacity': {
                'total': total_capacity,
                'used': total_load,
                'available': total_capacity - total_load,
                'utilization_percentage': (total_load / total_capacity * 100) if total_capacity > 0 else 0
            },
            'jobs': {
                'pending': pending_jobs,
                'processing': processing_jobs,
                'completed': completed_jobs,
                'failed': failed_jobs,
                'total': len(self.jobs)
            },
            'performance': {
                'average_processing_time': sum(i.processing_time_avg for i in self.instances.values()) / len(self.instances) if self.instances else 0,
                'success_rate': (completed_jobs / len(self.jobs) * 100) if self.jobs else 100
            }
        }

# Global cloud processor instance
cloud_processor = CloudOMRProcessor()

async def main():
    """Test cloud processing system"""
    
    # Add test instances
    await cloud_processor.add_instance(
        'test-local',
        'http://localhost:5000',
        'local',
        5
    )
    
    # Submit test job
    test_image_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."  # Truncated
    answer_key = ['A'] * 40
    
    job_id = await cloud_processor.submit_job(
        test_image_b64,
        answer_key,
        'professional',
        priority=8
    )
    
    print(f"Submitted job: {job_id}")
    
    # Wait for result
    result = await cloud_processor.wait_for_job(job_id, timeout=30)
    
    print(f"Result: {result.success}")
    if result.success:
        print(f"Processing time: {result.processing_time:.2f}s")
        print(f"Instance: {result.instance_id}")
    else:
        print(f"Error: {result.error}")
    
    # Show cluster status
    status = cloud_processor.get_cluster_status()
    print(f"\nCluster Status:")
    print(f"Instances: {status['instances']['online']}/{status['instances']['total']} online")
    print(f"Capacity: {status['capacity']['utilization_percentage']:.1f}% utilized")
    print(f"Jobs: {status['jobs']['completed']} completed, {status['jobs']['failed']} failed")

if __name__ == "__main__":
    asyncio.run(main())