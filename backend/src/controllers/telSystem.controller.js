import TelSystem from '../models/telSystem.model.js';

// Create a new tel system
export const createTelSystem = async (req, res) => {
  try {
    const telSystem = new TelSystem(req.body);
    await telSystem.save();
    res.status(201).json(telSystem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all tel systems
export const getAllTelSystems = async (req, res) => {
  try {
    const tels = await TelSystem.find().sort({ createdAt: -1 });
    res.json(tels);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tel systems' });
  }
};

// Get a single tel system by ID
export const getTelSystemById = async (req, res) => {
  try {
    const tel = await TelSystem.findById(req.params.id);
    if (!tel) {
      return res.status(404).json({ error: 'Tel system not found' });
    }
    res.json(tel);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching tel system' });
  }
};

// Update a tel system
export const updateTelSystem = async (req, res) => {
  try {
    const tel = await TelSystem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!tel) {
      return res.status(404).json({ error: 'Tel system not found' });
    }
    res.json(tel);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a tel system
export const deleteTelSystem = async (req, res) => {
  try {
    const tel = await TelSystem.findByIdAndDelete(req.params.id);
    if (!tel) {
      return res.status(404).json({ error: 'Tel system not found' });
    }
    res.json({ message: 'Tel system deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting tel system' });
  }
};
