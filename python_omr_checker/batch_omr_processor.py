#!/usr/bin/env python3
"""
Batch OMR Processing System for EvalBee Professional
Process multiple OMR sheets simultaneously with progress tracking
"""

import os
import json
import logging
import asyncio
import time
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import uuid

from evalbee_professional_omr_engine import EvalBeeProfessionalOMREngine

logger = logging.getLogger(__name__)

@dataclass
class BatchItem:
    """Single item in batch processing"""
    id: str
    image_path: str
    answer_key: List[str]
    exam_name: str
    student_id: Optional[str] = None
    status: str = 'pending'  # pending, processing, completed, failed
    result: Optional[Dict] = None
    error: Optional[str] = None
    processing_time: float = 0.0
    created_at: float = 0.0
    completed_at: Optional[float] = None

@dataclass
class BatchProgress:
    """Batch processing progress"""
    batch_id: str
    total_items: int
    completed_items: int
    failed_items: int
    processing_items: int
    pending_items: int
    overall_progress: float
    estimated_time_remaining: float
    average_processing_time: float
    status: str  # running, completed, failed, cancelled
    started_at: float
    completed_at: Optional[float] = None

class BatchOMRProcessor:
    """Batch OMR processing system with progress tracking"""
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.professional_engine = EvalBeeProfessionalOMREngine()
        self.active_batches: Dict[str, Dict] = {}
        self.results_dir = Path("batch_results")
        self.results_dir.mkdir(exist_ok=True)
    
    async def process_batch(
        self, 
        items: List[BatchItem], 
        progress_callback: Optional[Callable[[BatchProgress], None]] = None
    ) -> Dict[str, Any]:
        """Process a batch of OMR sheets"""
        
        batch_id = str(uuid.uuid4())
        start_time = time.time()
        
        logger.info(f"🚀 Starting batch processing: {batch_id}")
        logger.info(f"📊 Total items: {len(items)}")
        
        # Initialize batch tracking
        batch_data = {
            'id': batch_id,
            'items': {item.id: item for item in items},
            'progress': BatchProgress(
                batch_id=batch_id,
                total_items=len(items),
                completed_items=0,
                failed_items=0,
                processing_items=0,
                pending_items=len(items),
                overall_progress=0.0,
                estimated_time_remaining=0.0,
                average_processing_time=0.0,
                status='running',
                started_at=start_time
            ),
            'results': {},
            'processing_times': []
        }
        
        self.active_batches[batch_id] = batch_data
        
        try:
            # Process items in parallel
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit all tasks
                future_to_item = {
                    executor.submit(self._process_single_item, item): item 
                    for item in items
                }
                
                # Process completed tasks
                for future in as_completed(future_to_item):
                    item = future_to_item[future]
                    
                    try:
                        # Update item status
                        batch_data['items'][item.id].status = 'processing'
                        batch_data['progress'].processing_items += 1
                        batch_data['progress'].pending_items -= 1
                        
                        # Get result
                        result = future.result()
                        
                        # Update item with result
                        batch_data['items'][item.id].status = 'completed'
                        batch_data['items'][item.id].result = result
                        batch_data['items'][item.id].completed_at = time.time()
                        
                        # Update progress
                        batch_data['progress'].completed_items += 1
                        batch_data['progress'].processing_items -= 1
                        
                        # Store result
                        batch_data['results'][item.id] = result
                        
                        # Update processing times
                        processing_time = batch_data['items'][item.id].processing_time
                        batch_data['processing_times'].append(processing_time)
                        
                    except Exception as e:
                        logger.error(f"❌ Item {item.id} failed: {e}")
                        
                        # Update item with error
                        batch_data['items'][item.id].status = 'failed'
                        batch_data['items'][item.id].error = str(e)
                        batch_data['items'][item.id].completed_at = time.time()
                        
                        # Update progress
                        batch_data['progress'].failed_items += 1
                        batch_data['progress'].processing_items -= 1
                    
                    # Update overall progress
                    self._update_batch_progress(batch_data)
                    
                    # Call progress callback
                    if progress_callback:
                        progress_callback(batch_data['progress'])
            
            # Finalize batch
            batch_data['progress'].status = 'completed'
            batch_data['progress'].completed_at = time.time()
            
            # Save results
            results_file = self.results_dir / f"batch_{batch_id}.json"
            self._save_batch_results(batch_data, results_file)
            
            logger.info(f"✅ Batch processing completed: {batch_id}")
            logger.info(f"📊 Results: {batch_data['progress'].completed_items} completed, {batch_data['progress'].failed_items} failed")
            
            return {
                'batch_id': batch_id,
                'status': 'completed',
                'progress': batch_data['progress'],
                'results': batch_data['results'],
                'summary': self._generate_batch_summary(batch_data)
            }
            
        except Exception as e:
            logger.error(f"❌ Batch processing failed: {e}")
            batch_data['progress'].status = 'failed'
            
            return {
                'batch_id': batch_id,
                'status': 'failed',
                'error': str(e),
                'progress': batch_data['progress']
            }
        
        finally:
            # Clean up
            if batch_id in self.active_batches:
                del self.active_batches[batch_id]
    
    def _process_single_item(self, item: BatchItem) -> Dict[str, Any]:
        """Process a single OMR sheet"""
        
        start_time = time.time()
        
        try:
            logger.info(f"🔄 Processing item: {item.id} ({item.exam_name})")
            
            # Process with professional engine
            result = self.professional_engine.process_omr_professional(
                item.image_path, 
                item.answer_key
            )
            
            processing_time = time.time() - start_time
            item.processing_time = processing_time
            
            # Convert result to serializable format
            serializable_result = {
                'extracted_answers': result.extracted_answers,
                'overall_confidence': result.overall_confidence,
                'processing_time': result.processing_time,
                'image_quality_metrics': result.image_quality_metrics,
                'performance_metrics': result.performance_metrics,
                'error_summary': result.error_summary,
                'system_recommendations': result.system_recommendations,
                'question_count': len(result.question_results),
                'high_confidence_count': result.performance_metrics.get('high_confidence_answers', 0),
                'processing_method': 'EvalBee Professional Multi-Pass Engine'
            }
            
            logger.info(f"✅ Item completed: {item.id} ({processing_time:.2f}s)")
            
            return serializable_result
            
        except Exception as e:
            processing_time = time.time() - start_time
            item.processing_time = processing_time
            
            logger.error(f"❌ Item failed: {item.id} - {e}")
            raise
    
    def _update_batch_progress(self, batch_data: Dict):
        """Update batch progress calculations"""
        
        progress = batch_data['progress']
        
        # Calculate overall progress
        total_processed = progress.completed_items + progress.failed_items
        progress.overall_progress = (total_processed / progress.total_items) * 100
        
        # Calculate average processing time
        if batch_data['processing_times']:
            progress.average_processing_time = sum(batch_data['processing_times']) / len(batch_data['processing_times'])
        
        # Estimate remaining time
        remaining_items = progress.pending_items + progress.processing_items
        if progress.average_processing_time > 0 and remaining_items > 0:
            progress.estimated_time_remaining = remaining_items * progress.average_processing_time
        else:
            progress.estimated_time_remaining = 0.0
    
    def _save_batch_results(self, batch_data: Dict, results_file: Path):
        """Save batch results to file"""
        
        try:
            # Prepare serializable data
            save_data = {
                'batch_id': batch_data['id'],
                'progress': {
                    'batch_id': batch_data['progress'].batch_id,
                    'total_items': batch_data['progress'].total_items,
                    'completed_items': batch_data['progress'].completed_items,
                    'failed_items': batch_data['progress'].failed_items,
                    'overall_progress': batch_data['progress'].overall_progress,
                    'average_processing_time': batch_data['progress'].average_processing_time,
                    'status': batch_data['progress'].status,
                    'started_at': batch_data['progress'].started_at,
                    'completed_at': batch_data['progress'].completed_at
                },
                'results': batch_data['results'],
                'items': {
                    item_id: {
                        'id': item.id,
                        'image_path': item.image_path,
                        'exam_name': item.exam_name,
                        'student_id': item.student_id,
                        'status': item.status,
                        'processing_time': item.processing_time,
                        'error': item.error,
                        'created_at': item.created_at,
                        'completed_at': item.completed_at
                    }
                    for item_id, item in batch_data['items'].items()
                }
            }
            
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(save_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"💾 Batch results saved: {results_file}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save batch results: {e}")
    
    def _generate_batch_summary(self, batch_data: Dict) -> Dict[str, Any]:
        """Generate batch processing summary"""
        
        progress = batch_data['progress']
        results = batch_data['results']
        
        # Calculate statistics
        total_questions = 0
        total_confidence = 0.0
        total_processing_time = 0.0
        quality_scores = []
        
        for result in results.values():
            if isinstance(result, dict):
                total_questions += result.get('question_count', 0)
                total_confidence += result.get('overall_confidence', 0.0)
                total_processing_time += result.get('processing_time', 0.0)
                
                quality_score = result.get('image_quality_metrics', {}).get('overall_quality', 0.0)
                quality_scores.append(quality_score)
        
        completed_count = progress.completed_items
        
        return {
            'total_items': progress.total_items,
            'completed_items': completed_count,
            'failed_items': progress.failed_items,
            'success_rate': (completed_count / progress.total_items * 100) if progress.total_items > 0 else 0,
            'average_confidence': (total_confidence / completed_count) if completed_count > 0 else 0,
            'average_processing_time': (total_processing_time / completed_count) if completed_count > 0 else 0,
            'average_quality_score': (sum(quality_scores) / len(quality_scores)) if quality_scores else 0,
            'total_questions_processed': total_questions,
            'total_processing_time': sum(batch_data['processing_times']),
            'batch_duration': (progress.completed_at - progress.started_at) if progress.completed_at else 0
        }
    
    def get_batch_status(self, batch_id: str) -> Optional[Dict]:
        """Get current status of a batch"""
        
        if batch_id in self.active_batches:
            batch_data = self.active_batches[batch_id]
            return {
                'batch_id': batch_id,
                'progress': batch_data['progress'],
                'status': batch_data['progress'].status
            }
        
        return None
    
    def cancel_batch(self, batch_id: str) -> bool:
        """Cancel a running batch"""
        
        if batch_id in self.active_batches:
            batch_data = self.active_batches[batch_id]
            batch_data['progress'].status = 'cancelled'
            logger.info(f"🛑 Batch cancelled: {batch_id}")
            return True
        
        return False
    
    def create_batch_from_directory(
        self, 
        images_dir: str, 
        answer_key: List[str], 
        exam_name: str
    ) -> List[BatchItem]:
        """Create batch items from a directory of images"""
        
        items = []
        images_path = Path(images_dir)
        
        if not images_path.exists():
            raise ValueError(f"Images directory not found: {images_dir}")
        
        # Supported image extensions
        image_extensions = {'.jpg', '.jpeg', '.png', '.tiff', '.bmp'}
        
        for image_file in images_path.iterdir():
            if image_file.suffix.lower() in image_extensions:
                item = BatchItem(
                    id=str(uuid.uuid4()),
                    image_path=str(image_file),
                    answer_key=answer_key,
                    exam_name=exam_name,
                    student_id=image_file.stem,  # Use filename as student ID
                    created_at=time.time()
                )
                items.append(item)
        
        logger.info(f"📁 Created batch with {len(items)} items from {images_dir}")
        
        return items

async def main():
    """Test batch processing system"""
    
    processor = BatchOMRProcessor(max_workers=2)
    
    # Create sample batch items
    answer_key = ['A'] * 40
    
    items = [
        BatchItem(
            id="test_1",
            image_path="../../test_image_40_questions.jpg",
            answer_key=answer_key,
            exam_name="Test Exam 1",
            student_id="STU001",
            created_at=time.time()
        ),
        BatchItem(
            id="test_2", 
            image_path="../../test_image_40_questions.jpg",
            answer_key=answer_key,
            exam_name="Test Exam 2",
            student_id="STU002",
            created_at=time.time()
        )
    ]
    
    # Progress callback
    def progress_callback(progress: BatchProgress):
        print(f"📊 Progress: {progress.overall_progress:.1f}% "
              f"({progress.completed_items}/{progress.total_items})")
    
    # Process batch
    try:
        result = await processor.process_batch(items, progress_callback)
        
        print("\n=== BATCH PROCESSING RESULTS ===")
        print(f"Batch ID: {result['batch_id']}")
        print(f"Status: {result['status']}")
        
        if 'summary' in result:
            summary = result['summary']
            print(f"Success Rate: {summary['success_rate']:.1f}%")
            print(f"Average Confidence: {summary['average_confidence']:.2f}")
            print(f"Average Processing Time: {summary['average_processing_time']:.2f}s")
            print(f"Total Questions: {summary['total_questions_processed']}")
        
    except Exception as e:
        print(f"❌ Batch processing error: {e}")

if __name__ == "__main__":
    asyncio.run(main())