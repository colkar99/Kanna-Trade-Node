let datas = [1,2,3,4,5,6,7,8,9,10]

let main = async(val) => {
    return new Promise((res,rej) => {
        setInterval(()=> {
            res("inside Promise", val);
        },2000)
    })

}

// async function test() {
//     for(let i =0 ; i < datas.length ; i++) {
//         console.log('Before await for ', datas[i]);
//         let result = await main( datas[i]);
//         console.log('After await. Value is ', result);
//     }
  
// }

// test().then(_ => console.log('After test() resolved'));
async function testing (){
for(let i =0 ; i < datas.length ; i++) {
    console.log('Before await for ', datas[i]);
    let result = await main( datas[i]);
   console.log('After await. Value is ', result);
}
}

testing()