"""
Performance Analysis and Image Optimization Script
Converts PNG/JPG images to WebP format and analyzes performance bottlenecks
"""

import os
import sys
from pathlib import Path
from PIL import Image
import json

def convert_to_webp(image_path, output_path=None, quality=85):
    """Convert image to WebP format"""
    try:
        img = Image.open(image_path)
        
        # If no output path specified, replace extension
        if output_path is None:
            output_path = str(Path(image_path).with_suffix('.webp'))
        
        # Convert RGBA to RGB if necessary
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        
        # Save as WebP
        img.save(output_path, 'webp', quality=quality, method=6)
        
        # Get file sizes
        original_size = os.path.getsize(image_path)
        new_size = os.path.getsize(output_path)
        reduction = ((original_size - new_size) / original_size) * 100
        
        return {
            'original': image_path,
            'webp': output_path,
            'original_size_kb': round(original_size / 1024, 2),
            'webp_size_kb': round(new_size / 1024, 2),
            'reduction_percent': round(reduction, 2)
        }
    except Exception as e:
        print(f"❌ Error converting {image_path}: {e}")
        return None

def find_images(directory):
    """Find all PNG and JPG images in directory"""
    image_extensions = {'.png', '.jpg', '.jpeg'}
    images = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if Path(file).suffix.lower() in image_extensions:
                images.append(os.path.join(root, file))
    
    return images

def analyze_performance_issues(project_root):
    """Analyze common React performance issues"""
    issues = []
    
    # Check App.tsx for performance issues
    app_tsx = os.path.join(project_root, 'src', 'App.tsx')
    if os.path.exists(app_tsx):
        with open(app_tsx, 'r', encoding='utf-8') as f:
            content = f.read()
            
            # Issue 1: Multiple useEffect hooks
            useeffect_count = content.count('useEffect')
            if useeffect_count > 5:
                issues.append({
                    'severity': 'HIGH',
                    'file': 'App.tsx',
                    'issue': f'Too many useEffect hooks ({useeffect_count})',
                    'recommendation': 'Consider consolidating related effects or moving to custom hooks'
                })
            
            # Issue 2: useMemo with complex calculations
            if 'useMemo' in content and 'sort' in content:
                issues.append({
                    'severity': 'MEDIUM',
                    'file': 'App.tsx',
                    'issue': 'Complex sorting in useMemo',
                    'recommendation': 'Consider debouncing or moving to Web Worker for heavy calculations'
                })
            
            # Issue 3: Multiple realtime subscriptions
            channel_count = content.count('.channel(')
            if channel_count > 2:
                issues.append({
                    'severity': 'HIGH',
                    'file': 'App.tsx',
                    'issue': f'Multiple realtime subscriptions ({channel_count})',
                    'recommendation': 'Consolidate subscriptions or use a single channel with filters'
                })
    
    return issues

def main():
    project_root = Path(__file__).parent
    public_dir = project_root / 'public'
    
    print("🔍 IFARMA PERFORMANCE ANALYSIS")
    print("=" * 60)
    
    # 1. Image Optimization
    print("\n📸 IMAGE OPTIMIZATION")
    print("-" * 60)
    
    images = find_images(public_dir)
    if images:
        print(f"Found {len(images)} images to optimize\n")
        
        total_saved = 0
        results = []
        
        for img_path in images:
            result = convert_to_webp(img_path)
            if result:
                results.append(result)
                saved_kb = result['original_size_kb'] - result['webp_size_kb']
                total_saved += saved_kb
                
                print(f"✅ {Path(img_path).name}")
                print(f"   Original: {result['original_size_kb']} KB")
                print(f"   WebP: {result['webp_size_kb']} KB")
                print(f"   Saved: {saved_kb:.2f} KB ({result['reduction_percent']}%)\n")
        
        print(f"💾 Total space saved: {total_saved:.2f} KB ({total_saved/1024:.2f} MB)")
    else:
        print("✅ No images found to optimize")
    
    # 2. Performance Issues Analysis
    print("\n⚡ PERFORMANCE ISSUES DETECTED")
    print("-" * 60)
    
    issues = analyze_performance_issues(project_root)
    
    if issues:
        for issue in issues:
            severity_emoji = "🔴" if issue['severity'] == 'HIGH' else "🟡"
            print(f"\n{severity_emoji} {issue['severity']} - {issue['file']}")
            print(f"   Issue: {issue['issue']}")
            print(f"   Fix: {issue['recommendation']}")
    else:
        print("✅ No major performance issues detected")
    
    # 3. Recommendations
    print("\n💡 OPTIMIZATION RECOMMENDATIONS")
    print("-" * 60)
    print("""
1. ✅ Images converted to WebP (done)
2. 🔄 Consider lazy loading components with React.lazy()
3. 🔄 Implement code splitting for routes
4. 🔄 Use React.memo for expensive components
5. 🔄 Debounce expensive calculations (sorting, filtering)
6. 🔄 Consider virtualizing long lists (react-window)
7. 🔄 Optimize Supabase subscriptions (consolidate channels)
8. 🔄 Add loading states and skeleton screens
9. 🔄 Implement service worker for offline caching
10. 🔄 Use Lighthouse for detailed performance audit
    """)
    
    # Save report
    report = {
        'images_optimized': len(results) if images else 0,
        'total_saved_kb': round(total_saved, 2) if images else 0,
        'performance_issues': issues
    }
    
    with open(project_root / 'performance_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print("\n📊 Report saved to: performance_report.json")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
