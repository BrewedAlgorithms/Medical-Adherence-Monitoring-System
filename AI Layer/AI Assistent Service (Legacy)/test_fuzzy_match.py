from difflib import SequenceMatcher
from typing import List, Dict, Tuple

def find_best_medicine_match(query: str, medications: List[Dict]) -> Tuple[Dict, float]:
    """
    Find the best matching medicine using fuzzy string matching.
    Returns the medication dict and the match ratio.
    """
    best_match = None
    best_ratio = 0
    query = query.lower()
    
    print(f"\nSearching for medicine matching: '{query}'")
    print("Available medications:")
    
    for med in medications:
        med_name = med.get("medicine_name", "").lower()
        print(f"- Checking '{med_name}'")
        
        # Use SequenceMatcher for fuzzy matching
        ratio = SequenceMatcher(None, query, med_name).ratio()
        print(f"  Initial ratio: {ratio}")
        
        # Also check if the query is a substring of the medicine name
        if query in med_name:
            ratio = max(ratio, 0.9)
            print(f"  Substring match found! Boosted ratio to: {ratio}")
            
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = med
            print(f"  New best match: '{med_name}' with ratio {ratio}")
    
    return best_match, best_ratio

def main():
    # Test data
    medications = [
        {"medicine_name": "Paracetamol"},
        {"medicine_name": "Antibiotic A"},
        {"medicine_name": "Aspirin"},
        {"medicine_name": "Vitamin D3"}
    ]
    
    # Test case 1: Completely wrong name
    test_name = "completely wrong name"
    match, ratio = find_best_medicine_match(test_name, medications)
    
    print("\nTest Results:")
    print(f"Input: '{test_name}'")
    print(f"Best match ratio: {ratio}")
    
    # Find similar medications (ratio > 0.3)
    similar_meds = [
        med["medicine_name"] 
        for med in medications 
        if SequenceMatcher(None, test_name.lower(), med["medicine_name"].lower()).ratio() > 0.3
    ]
    
    if similar_meds:
        print(f"Similar medications found: {', '.join(similar_meds)}")
    else:
        print("No similar medications found")
    
    # Test case 2: Misspelled name
    test_name = "paracetamole"
    match, ratio = find_best_medicine_match(test_name, medications)
    print(f"\nInput: '{test_name}'")
    print(f"Best match: {match['medicine_name'] if match else 'None'}")
    print(f"Match ratio: {ratio}")

if __name__ == "__main__":
    main() 