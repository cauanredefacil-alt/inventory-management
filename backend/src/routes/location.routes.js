import express from 'express';
import Location from '../models/location.model.js';

const router = express.Router();

// Create a new location
router.post('/', async (req, res) => {
  try {
    const location = new Location(req.body);
    await location.save();
    res.status(201).json(location);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all locations
router.get('/', async (_req, res) => {
  try {
    const locations = await Location.find().sort({ name: 1 });
    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching locations' });
  }
});

// Get location by ID
router.get('/:id', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching location' });
  }
});

// Update location
router.put('/:id', async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json(location);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete location
router.delete('/:id', async (req, res) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) return res.status(404).json({ error: 'Location not found' });
    res.json({ message: 'Location deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting location' });
  }
});

export default router;
