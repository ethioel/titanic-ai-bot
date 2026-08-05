import time
import random
from datetime import datetime, timedelta

class TitanicSimulator:
    def __init__(self):
        self.timeline = []
        self.current_time = None
        self.decisions = []
        self.survival_probability = 0.5
        self.simulation_active = False
        
    def initialize_simulation(self, passenger_data, initial_probability):
        """Start the simulation"""
        self.passenger = passenger_data
        self.survival_probability = initial_probability
        self.decisions = []
        self.simulation_active = True
        
        # Set starting time to 11:40 PM (impact time)
        self.current_time = datetime(1912, 4, 14, 23, 40)
        
        # Build timeline events
        self.timeline = self._build_timeline()
        
        return {
            'started': True,
            'current_time': self.current_time.strftime('%I:%M %p'),
            'survival_probability': self.survival_probability,
            'message': "⚠️ The Titanic has struck an iceberg! Emergency simulation started.",
            'next_event': self.timeline[0] if self.timeline else None
        }
    
    def _build_timeline(self):
        """Build the 15-minute emergency timeline"""
        events = []
        
        # Impact event
        events.append({
            'time': '11:40 PM',
            'minutes_from_impact': 0,
            'event': 'Titanic strikes iceberg on starboard side.',
            'choices': None,
            'survival_modifier': 0
        })
        
        # 5 minutes
        events.append({
            'time': '11:45 PM',
            'minutes_from_impact': 5,
            'event': 'Water begins entering the forward compartments.',
            'choices': [
                {'id': 'go_upper', 'text': 'Head to the upper deck immediately', 'modifier': 0.05},
                {'id': 'stay_cabin', 'text': 'Go back to your cabin for belongings', 'modifier': -0.1},
                {'id': 'help_others', 'text': 'Help others in your area', 'modifier': 0.02}
            ],
            'survival_modifier': 0
        })
        
        # 10 minutes
        events.append({
            'time': '11:50 PM',
            'minutes_from_impact': 10,
            'event': 'First lifeboats begin to be prepared for launch.',
            'choices': [
                {'id': 'lifeboat_launch', 'text': 'Rush to the lifeboat station', 'modifier': 0.15},
                {'id': 'help_launch', 'text': 'Assist with lifeboat preparation', 'modifier': 0.05},
                {'id': 'wait_instructions', 'text': 'Wait for official instructions', 'modifier': -0.05}
            ],
            'survival_modifier': 0
        })
        
        # 15 minutes
        events.append({
            'time': '11:55 PM',
            'minutes_from_impact': 15,
            'event': 'Ship begins to list to starboard. Panic spreading.',
            'choices': [
                {'id': 'stay_calm', 'text': 'Stay calm and follow procedures', 'modifier': 0.03},
                {'id': 'panic', 'text': 'Panic and push towards lifeboats', 'modifier': -0.1}
            ],
            'survival_modifier': 0
        })
        
        return events
    
    def make_decision(self, decision_id):
        """Process a user decision"""
        if not self.simulation_active:
            return {'error': 'Simulation not active'}
        
        # Find the event
        current_event = None
        for event in self.timeline:
            if event['choices'] and any(c['id'] == decision_id for c in event['choices']):
                current_event = event
                break
        
        if not current_event:
            return {'error': 'Invalid decision'}
        
        # Find the choice
        choice = next(c for c in current_event['choices'] if c['id'] == decision_id)
        
        # Apply modifier
        self.survival_probability += choice['modifier']
        self.survival_probability = max(0, min(1, self.survival_probability))
        
        # Record decision
        self.decisions.append({
            'time': current_event['time'],
            'decision': choice['text'],
            'modifier': choice['modifier'],
            'new_probability': self.survival_probability
        })
        
        # Remove event from timeline
        if current_event in self.timeline:
            self.timeline.remove(current_event)
        
        # Get next event
        next_event = self.timeline[0] if self.timeline else None
        
        # Check if simulation is complete
        if not self.timeline:
            self.simulation_active = False
            return {
                'complete': True,
                'final_probability': self.survival_probability,
                'survived': self.survival_probability > 0.5,
                'decisions': self.decisions,
                'message': "The simulation is complete. Your choices have determined your survival outcome.",
                'next_event': None
            }
        
        return {
            'complete': False,
            'survival_probability': self.survival_probability,
            'message': f"Decision recorded: {choice['text']}. Your survival probability is now {self.survival_probability:.0%}.",
            'next_event': next_event,
            'decisions': self.decisions
        }
    
    def get_status(self):
        """Get current simulation status"""
        if not self.simulation_active:
            return {'active': False}
        
        return {
            'active': True,
            'current_time': self.current_time.strftime('%I:%M %p'),
            'survival_probability': self.survival_probability,
            'decisions_made': len(self.decisions),
            'events_remaining': len(self.timeline),
            'next_event': self.timeline[0] if self.timeline else None
        }