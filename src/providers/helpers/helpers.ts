import { Injectable } from '@angular/core';

@Injectable()
export class HelpersProvider {

  constructor() {}

  inArray = (array, value): boolean => {
    if (array.indexOf(value) === -1) return true;
    return false;
  }
  
  inObject = (object, key, value): boolean => {
    const index = object.findIndex(data => data[key] === value);
    return index !== -1 ? true : false;
  }

  inKey = (object, key): boolean => {
    return object.valueOf()[key] !== undefined;
  }

  getKey = (object, value): boolean => {
    const key = Object.keys(object).find(key => object[key] === value);
    return key !== undefined ? true : false;
  }

  objectLength = (object): number => {
    return Object.keys(object).length;
  }

  arrayLength = (array): number => {
    return array.length;
  }

  mergingObject = (object, other): any => {
    return Object.assign({}, object, other);
  }

  // delete object.key atau delete object[key]; -> hapus
  // object.kay = value -> add
  /*
  var array = [{
  name: "foo1",
  value: "val1"
  }, {
    name: "foo1",
    value: ["val2", "val3"]
  }, {
    name: "foo2",
    value: "val4"
  }];

  var output = [];

  array.forEach(function(item) {
    var existing = output.filter(function(v, i) {
      return v.name == item.name;
    });
    if (existing.length) {
      var existingIndex = output.indexOf(existing[0]);
      output[existingIndex].value = output[existingIndex].value.concat(item.value);
    } else {
      if (typeof item.value == 'string')
        item.value = [item.value];
      output.push(item);
    }
  });

  console.dir(output);


  Mergin Object:
  var op1 = { "anu":"1"};
  var op2 = { "ono":"2" };
  var op = Object.assign({}, op1, op2);
  op -> { anu: "12", ono: "2" }

  Object Spread:
  const cat = {  
    legs: 4,
    sound: 'meow'
  };
  const dog = {  
    ...cat,
    sound: 'woof'
  };

  console.log(dog); // => { legs: 4, sounds: 'woof' }
  */
  // array.splice(value, 1); -> remove
  // array.push(value) -> add
  // array.reverse -> reverse susunan

  /*
  Numeric array short Accending:
  var points = [40, 100, 1, 5, 25, 10];
  points.sort(function(a, b){return a - b});

  Numeric array short descending:
  var points = [40, 100, 1, 5, 25, 10];
  points.sort(function(a, b){return b - a});

  Merge Array:
  var huruf = ['a', 'b', 'c'],
  angka = [1, 2, 3];

  var hurufAngka = huruf.concat(angka);

  console.log(hurufAngka); // Hasil: ['a', 'b', 'c', 1, 2, 3]
  */

}
