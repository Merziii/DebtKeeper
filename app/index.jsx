import { useState, useEffect } from "react";
import { Text, View, ScrollView, Pressable, TextInput, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SQLite from 'expo-sqlite';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

let db = null;

// Function to setup the SQLite database
const setDatabase = async () => {
  db = await SQLite.openDatabaseAsync('debtkeeper.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS debts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      name TEXT NOT NULL, 
      amount REAL NOT NULL, 
      date TEXT NOT NULL,
      status TEXT DEFAULT 'Pending'
    );
  `);
};

// Start the app
export default function Index() {
  // Initialize state variables
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Pending");
  const [debts, setDebts] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
  setDatabase().then(fetchDebts);
  }, []);


  // (C)Function to add a new debt to the database
const addDebt = async () => {
  if (!db || !name || !amount || !date) return;
  await db.runAsync(`
    INSERT INTO debts (name, amount, date, status) 
    VALUES (?, ?, ?, ?);
  `, [name, parseFloat(amount), date, status]);
  setName("");
  setAmount("");
  setDate("");
  setStatus("Pending");
  fetchDebts();
};

  // (R)Function to fetch all debts from the database
const fetchDebts = async () => {
  if (!db) return;
  const results = await db.getAllAsync('SELECT * FROM debts;');
  setDebts(
    results.map((row) => ({
      id: row.id,
      name: row.name,
      amount: row.amount,
      date: row.date,
      status: row.status,
    }))
  );
};

// (U)Function to update a debt information in the database
const updateDebt = async (id, name, amount, date, status) => {
  if (!db || !id || !name || !amount || !date) return
  await db.runAsync(`
    UPDATE debts 
    SET name = ?, amount = ?, date = ?, status = ? 
    WHERE id = ?;
  `, [name, parseFloat(amount), date, status, id]);
  fetchDebts();
};

// (D)Function to delete a debt from the database
const deleteDebt = async (id) => {
   if (!db) return;
   await db.runAsync(`
     DELETE FROM debts WHERE id = ?;
   `, [id]);
   fetchDebts();
};

// Update the satus of the debt
const toggleStatus = async (id, currentStatus) => {
  const newStatus = currentStatus === "Pending" ? "Paid" : "Pending";
  await db.runAsync(`
    UPDATE debts 
    SET status = ? 
    WHERE id = ?;
  `, [newStatus, id]);
  fetchDebts(); 
};

  // Function for the Pencil icon to start editing a debt
  const startEdit = (debt) => {
    setEditingId(debt.id);
    setName(debt.name);
    setAmount(debt.amount.toString()); // Convert amount input to string to make it currency format 
    setDate(debt.date);
    setStatus(debt.status);
  };

  // Ginagawa nito ung pag save ng changes sa editing mode para masave nung updateDebt function
  const handleUpdate = async () => {
    if (!editingId) return;
    await updateDebt(editingId, name, amount, date, status);
    setEditingId(null);
    setName("");
    setAmount("");
    setDate("");
    setStatus("pending");
    fetchDebts();
  };

// Main Display ng app
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>💸 Debt Keeper 💸</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Debtor's Name"
          value={name}
          onChangeText={setName}
          maxLength={25}  
        />
        <TextInput
          style={styles.input}
          placeholder="Amount owed (₱)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          maxLength={10}
        />
        <TextInput
          style={styles.input}
          placeholder="Borrowed date (MM/DD/YYYY)"
          value={date}
          maxLength={16}
          onChangeText={(setDate) => {
            setAmount(setDate);
            if (setDate.length < 10) {
              console.warn("Input a Proper Date Format");
              }
            }
          }
        />
{/* Buttons for Add and Update of Debtor's */}
        <Pressable
          style={styles.addButton}
          onPress={editingId ? handleUpdate : addDebt}
        >
          <Text style={styles.addButtonText}>
            {editingId ? "Update Debtor's Details" : "Add a Debtor"}
          </Text>
        </Pressable>
{/* Show cancel button when editing */}        
        {editingId && (
          <Pressable
            style={[styles.addButton, { backgroundColor: "grey", marginTop: 8 }]}
            onPress={() => {
              setEditingId(null);
              setName("");
              setAmount("");
              setDate("");
              setStatus("Pending");
            }}
          >
            <Text style={styles.addButtonText}>Cancel Edit</Text>
          </Pressable>
        )}
      </View>
{/* Listing ng mga may utang */}
      <ScrollView style={styles.listContainer}>
        {debts.map((item) => (
          <View
            key={item.id}
            style={[
              styles.debtItem,
              item.status === "Paid" && { backgroundColor: "#99BC85"},
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.debtName}>{item.name}</Text>
              <Text style={styles.debtText}> 
            {/* Display amount with currency format */}
                ₱{Number(item.amount).toLocaleString()} | {item.date} 
              </Text>
              <Text>Status: {item.status}</Text>
            </View>
{/* Check button to set if paid or not in edit mode*/}
            {editingId == item.id && (
              <Pressable
                onPress={() => { {/* Toggle status button */}
                  const newStatus = item.status === "Pending" ? "Paid" : "Pending";
                  toggleStatus(item.id, item.status);
                  setStatus(newStatus); 
                }}
              >
                <MaterialCommunityIcons
                  name={item.status === "Pending" ? "checkbox-blank-circle-outline" : "check-circle"}
                  size={38}
                  color={item.status === "Pending" ? "orange" : "green"}
                />
              </Pressable>
            )}
{/* Edit and Delete buttons */}
            <Pressable onPress={() => startEdit(item)}>
              <MaterialCommunityIcons name="pencil-circle" size={38} color="#2196f3" />
            </Pressable>
            <Pressable onPress={() => deleteDebt(item.id)}>
              <MaterialCommunityIcons name="delete-circle" size={38} color="red" />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

// For styling the components
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#d5e1df',
    padding: 18,
  },
  header: {
    backgroundColor: '#4caf50',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 34,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 8,
  },
  inputContainer: {
    marginBottom: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    elevation: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#4caf50',
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  listContainer: {
    flex: 1,
  },
  debtItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    borderColor: 'gray', 
    borderWidth: 2,         
  },
  debtName: {
    fontWeight: 'heavy', 
    fontWeight: 'bold',
    fontSize: 28,
  },
  debtText: {
    fontSize: 16,
    color: '#555',
  },
});
