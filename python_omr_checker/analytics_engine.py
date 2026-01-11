#!/usr/bin/env python3
"""
Analytics Engine for EvalBee Professional OMR System
Provides comprehensive analytics and insights for OMR processing
"""

import json
import logging
import sqlite3
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import statistics
from pathlib import Path
import numpy as np

logger = logging.getLogger(__name__)

@dataclass
class ProcessingRecord:
    """Single OMR processing record"""
    id: str
    timestamp: datetime
    exam_name: str
    student_id: Optional[str]
    processing_method: str
    processing_time: float
    overall_confidence: float
    image_quality: float
    questions_count: int
    correct_answers: int
    blank_answers: int
    error_flags: List[str]
    recommendations: List[str]

@dataclass
class AnalyticsReport:
    """Comprehensive analytics report"""
    period: str
    total_processed: int
    average_confidence: float
    average_processing_time: float
    average_quality: float
    success_rate: float
    common_errors: List[Tuple[str, int]]
    quality_distribution: Dict[str, int]
    confidence_distribution: Dict[str, int]
    processing_trends: List[Dict[str, Any]]
    recommendations_summary: List[Tuple[str, int]]

class AnalyticsEngine:
    """Analytics engine for OMR processing insights"""
    
    def __init__(self, db_path: str = "omr_analytics.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize analytics database"""
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS processing_records (
                        id TEXT PRIMARY KEY,
                        timestamp TEXT NOT NULL,
                        exam_name TEXT,
                        student_id TEXT,
                        processing_method TEXT,
                        processing_time REAL,
                        overall_confidence REAL,
                        image_quality REAL,
                        questions_count INTEGER,
                        correct_answers INTEGER,
                        blank_answers INTEGER,
                        error_flags TEXT,
                        recommendations TEXT
                    )
                """)
                
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_timestamp 
                    ON processing_records(timestamp)
                """)
                
                conn.execute("""
                    CREATE INDEX IF NOT EXISTS idx_exam_name 
                    ON processing_records(exam_name)
                """)
                
                conn.commit()
                
            logger.info("📊 Analytics database initialized")
            
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
    
    def record_processing(self, record: ProcessingRecord):
        """Record a new OMR processing result"""
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("""
                    INSERT OR REPLACE INTO processing_records 
                    (id, timestamp, exam_name, student_id, processing_method,
                     processing_time, overall_confidence, image_quality,
                     questions_count, correct_answers, blank_answers,
                     error_flags, recommendations)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.id,
                    record.timestamp.isoformat(),
                    record.exam_name,
                    record.student_id,
                    record.processing_method,
                    record.processing_time,
                    record.overall_confidence,
                    record.image_quality,
                    record.questions_count,
                    record.correct_answers,
                    record.blank_answers,
                    json.dumps(record.error_flags),
                    json.dumps(record.recommendations)
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"❌ Failed to record processing: {e}")
    
    def generate_report(self, 
                       period_days: int = 30,
                       exam_name: Optional[str] = None) -> AnalyticsReport:
        """Generate comprehensive analytics report"""
        
        try:
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=period_days)
            
            # Build query
            query = """
                SELECT * FROM processing_records 
                WHERE timestamp >= ? AND timestamp <= ?
            """
            params = [start_date.isoformat(), end_date.isoformat()]
            
            if exam_name:
                query += " AND exam_name = ?"
                params.append(exam_name)
            
            query += " ORDER BY timestamp DESC"
            
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(query, params)
                records = cursor.fetchall()
            
            if not records:
                return self._empty_report(period_days)
            
            # Analyze records
            return self._analyze_records(records, period_days)
            
        except Exception as e:
            logger.error(f"❌ Report generation failed: {e}")
            return self._empty_report(period_days)
    
    def _analyze_records(self, records: List[sqlite3.Row], period_days: int) -> AnalyticsReport:
        """Analyze processing records"""
        
        total_processed = len(records)
        
        # Extract metrics
        confidences = [r['overall_confidence'] for r in records if r['overall_confidence'] is not None]
        processing_times = [r['processing_time'] for r in records if r['processing_time'] is not None]
        qualities = [r['image_quality'] for r in records if r['image_quality'] is not None]
        
        # Calculate averages
        avg_confidence = statistics.mean(confidences) if confidences else 0.0
        avg_processing_time = statistics.mean(processing_times) if processing_times else 0.0
        avg_quality = statistics.mean(qualities) if qualities else 0.0
        
        # Calculate success rate (confidence > 0.7)
        high_confidence_count = sum(1 for c in confidences if c > 0.7)
        success_rate = (high_confidence_count / len(confidences)) if confidences else 0.0
        
        # Analyze error patterns
        common_errors = self._analyze_error_patterns(records)
        
        # Quality distribution
        quality_distribution = self._calculate_quality_distribution(qualities)
        
        # Confidence distribution
        confidence_distribution = self._calculate_confidence_distribution(confidences)
        
        # Processing trends
        processing_trends = self._calculate_processing_trends(records)
        
        # Recommendations summary
        recommendations_summary = self._analyze_recommendations(records)
        
        return AnalyticsReport(
            period=f"Last {period_days} days",
            total_processed=total_processed,
            average_confidence=avg_confidence,
            average_processing_time=avg_processing_time,
            average_quality=avg_quality,
            success_rate=success_rate,
            common_errors=common_errors,
            quality_distribution=quality_distribution,
            confidence_distribution=confidence_distribution,
            processing_trends=processing_trends,
            recommendations_summary=recommendations_summary
        )
    
    def _analyze_error_patterns(self, records: List[sqlite3.Row]) -> List[Tuple[str, int]]:
        """Analyze common error patterns"""
        
        error_counts = {}
        
        for record in records:
            if record['error_flags']:
                try:
                    errors = json.loads(record['error_flags'])
                    for error in errors:
                        error_counts[error] = error_counts.get(error, 0) + 1
                except json.JSONDecodeError:
                    continue
        
        # Sort by frequency
        sorted_errors = sorted(error_counts.items(), key=lambda x: x[1], reverse=True)
        
        return sorted_errors[:10]  # Top 10 errors
    
    def _calculate_quality_distribution(self, qualities: List[float]) -> Dict[str, int]:
        """Calculate quality score distribution"""
        
        distribution = {
            'excellent': 0,  # 0.8+
            'good': 0,       # 0.6-0.8
            'fair': 0,       # 0.4-0.6
            'poor': 0        # <0.4
        }
        
        for quality in qualities:
            if quality >= 0.8:
                distribution['excellent'] += 1
            elif quality >= 0.6:
                distribution['good'] += 1
            elif quality >= 0.4:
                distribution['fair'] += 1
            else:
                distribution['poor'] += 1
        
        return distribution
    
    def _calculate_confidence_distribution(self, confidences: List[float]) -> Dict[str, int]:
        """Calculate confidence score distribution"""
        
        distribution = {
            'high': 0,    # 0.8+
            'medium': 0,  # 0.6-0.8
            'low': 0      # <0.6
        }
        
        for confidence in confidences:
            if confidence >= 0.8:
                distribution['high'] += 1
            elif confidence >= 0.6:
                distribution['medium'] += 1
            else:
                distribution['low'] += 1
        
        return distribution
    
    def _calculate_processing_trends(self, records: List[sqlite3.Row]) -> List[Dict[str, Any]]:
        """Calculate processing trends over time"""
        
        # Group by day
        daily_stats = {}
        
        for record in records:
            try:
                date = datetime.fromisoformat(record['timestamp']).date()
                date_str = date.isoformat()
                
                if date_str not in daily_stats:
                    daily_stats[date_str] = {
                        'date': date_str,
                        'count': 0,
                        'total_confidence': 0.0,
                        'total_processing_time': 0.0,
                        'total_quality': 0.0
                    }
                
                stats = daily_stats[date_str]
                stats['count'] += 1
                
                if record['overall_confidence'] is not None:
                    stats['total_confidence'] += record['overall_confidence']
                
                if record['processing_time'] is not None:
                    stats['total_processing_time'] += record['processing_time']
                
                if record['image_quality'] is not None:
                    stats['total_quality'] += record['image_quality']
                    
            except (ValueError, TypeError):
                continue
        
        # Calculate averages
        trends = []
        for date_str, stats in sorted(daily_stats.items()):
            count = stats['count']
            trends.append({
                'date': date_str,
                'processed_count': count,
                'average_confidence': stats['total_confidence'] / count if count > 0 else 0,
                'average_processing_time': stats['total_processing_time'] / count if count > 0 else 0,
                'average_quality': stats['total_quality'] / count if count > 0 else 0
            })
        
        return trends
    
    def _analyze_recommendations(self, records: List[sqlite3.Row]) -> List[Tuple[str, int]]:
        """Analyze common recommendations"""
        
        recommendation_counts = {}
        
        for record in records:
            if record['recommendations']:
                try:
                    recommendations = json.loads(record['recommendations'])
                    for rec in recommendations:
                        recommendation_counts[rec] = recommendation_counts.get(rec, 0) + 1
                except json.JSONDecodeError:
                    continue
        
        # Sort by frequency
        sorted_recommendations = sorted(recommendation_counts.items(), key=lambda x: x[1], reverse=True)
        
        return sorted_recommendations[:10]  # Top 10 recommendations
    
    def _empty_report(self, period_days: int) -> AnalyticsReport:
        """Create empty report when no data available"""
        
        return AnalyticsReport(
            period=f"Last {period_days} days",
            total_processed=0,
            average_confidence=0.0,
            average_processing_time=0.0,
            average_quality=0.0,
            success_rate=0.0,
            common_errors=[],
            quality_distribution={'excellent': 0, 'good': 0, 'fair': 0, 'poor': 0},
            confidence_distribution={'high': 0, 'medium': 0, 'low': 0},
            processing_trends=[],
            recommendations_summary=[]
        )
    
    def get_exam_statistics(self, exam_name: str) -> Dict[str, Any]:
        """Get statistics for a specific exam"""
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as total_processed,
                        AVG(overall_confidence) as avg_confidence,
                        AVG(processing_time) as avg_processing_time,
                        AVG(image_quality) as avg_quality,
                        SUM(CASE WHEN overall_confidence > 0.7 THEN 1 ELSE 0 END) as high_confidence_count
                    FROM processing_records 
                    WHERE exam_name = ?
                """, (exam_name,))
                
                stats = cursor.fetchone()
                
                if stats['total_processed'] == 0:
                    return {'exam_name': exam_name, 'total_processed': 0}
                
                return {
                    'exam_name': exam_name,
                    'total_processed': stats['total_processed'],
                    'average_confidence': stats['avg_confidence'] or 0.0,
                    'average_processing_time': stats['avg_processing_time'] or 0.0,
                    'average_quality': stats['avg_quality'] or 0.0,
                    'success_rate': (stats['high_confidence_count'] / stats['total_processed']) if stats['total_processed'] > 0 else 0.0
                }
                
        except Exception as e:
            logger.error(f"❌ Exam statistics failed: {e}")
            return {'exam_name': exam_name, 'error': str(e)}
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get overall system performance metrics"""
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                # Overall statistics
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as total_processed,
                        AVG(overall_confidence) as avg_confidence,
                        AVG(processing_time) as avg_processing_time,
                        AVG(image_quality) as avg_quality,
                        MIN(timestamp) as first_processing,
                        MAX(timestamp) as last_processing
                    FROM processing_records
                """)
                
                overall_stats = cursor.fetchone()
                
                # Processing method distribution
                cursor = conn.execute("""
                    SELECT processing_method, COUNT(*) as count
                    FROM processing_records
                    GROUP BY processing_method
                    ORDER BY count DESC
                """)
                
                method_distribution = dict(cursor.fetchall())
                
                # Recent performance (last 7 days)
                week_ago = (datetime.now() - timedelta(days=7)).isoformat()
                cursor = conn.execute("""
                    SELECT 
                        COUNT(*) as recent_processed,
                        AVG(overall_confidence) as recent_avg_confidence
                    FROM processing_records
                    WHERE timestamp >= ?
                """, (week_ago,))
                
                recent_stats = cursor.fetchone()
                
                return {
                    'total_processed': overall_stats['total_processed'],
                    'average_confidence': overall_stats['avg_confidence'] or 0.0,
                    'average_processing_time': overall_stats['avg_processing_time'] or 0.0,
                    'average_quality': overall_stats['avg_quality'] or 0.0,
                    'first_processing': overall_stats['first_processing'],
                    'last_processing': overall_stats['last_processing'],
                    'method_distribution': method_distribution,
                    'recent_processed': recent_stats['recent_processed'],
                    'recent_average_confidence': recent_stats['recent_avg_confidence'] or 0.0
                }
                
        except Exception as e:
            logger.error(f"❌ Performance metrics failed: {e}")
            return {'error': str(e)}
    
    def export_report(self, report: AnalyticsReport, output_file: str):
        """Export analytics report to JSON file"""
        
        try:
            report_dict = asdict(report)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(report_dict, f, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"📄 Report exported: {output_file}")
            
        except Exception as e:
            logger.error(f"❌ Report export failed: {e}")

def main():
    """Test analytics engine"""
    
    analytics = AnalyticsEngine()
    
    # Create sample records
    sample_records = [
        ProcessingRecord(
            id="test_1",
            timestamp=datetime.now() - timedelta(days=1),
            exam_name="Math Test",
            student_id="STU001",
            processing_method="EvalBee Professional",
            processing_time=4.5,
            overall_confidence=0.85,
            image_quality=0.78,
            questions_count=40,
            correct_answers=35,
            blank_answers=2,
            error_flags=["LOW_CONTRAST"],
            recommendations=["Yorug'likni yaxshilang"]
        ),
        ProcessingRecord(
            id="test_2",
            timestamp=datetime.now() - timedelta(hours=12),
            exam_name="Science Test",
            student_id="STU002",
            processing_method="EvalBee Professional",
            processing_time=3.8,
            overall_confidence=0.92,
            image_quality=0.88,
            questions_count=40,
            correct_answers=38,
            blank_answers=1,
            error_flags=[],
            recommendations=["Ajoyib sifat"]
        )
    ]
    
    # Record sample data
    for record in sample_records:
        analytics.record_processing(record)
    
    # Generate report
    report = analytics.generate_report(period_days=7)
    
    print("\n=== ANALYTICS REPORT ===")
    print(f"Period: {report.period}")
    print(f"Total Processed: {report.total_processed}")
    print(f"Average Confidence: {report.average_confidence:.2f}")
    print(f"Average Processing Time: {report.average_processing_time:.2f}s")
    print(f"Success Rate: {report.success_rate:.1%}")
    
    print(f"\nQuality Distribution:")
    for level, count in report.quality_distribution.items():
        print(f"  {level}: {count}")
    
    print(f"\nCommon Errors:")
    for error, count in report.common_errors:
        print(f"  {error}: {count}")
    
    # Export report
    analytics.export_report(report, "analytics_report.json")

if __name__ == "__main__":
    main()